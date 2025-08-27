import { Types } from "mongoose";
import { CashSessionModel, OrderPointModel, PointOfSalesModel } from "../../database/models";
import { CashSessionStatus, ICashSession, OrderPointStatus } from "../../interfaces";

export interface SessionFilters {
    companyId: Types.ObjectId;
    pointOfSalesId?: Types.ObjectId;
    userId?: Types.ObjectId;
    status?: CashSessionStatus;
    dateRange?: {
        start: Date;
        end: Date;
    };
}

export interface SessionStatistics {
    totalOrders: number;
    totalSales: number;
    totalCashSales: number;
    totalCardSales: number;
    totalRefunds: number;
    averageOrderValue: number;
}

export interface CreateSessionData {
    pointOfSalesId: Types.ObjectId;
    userId: Types.ObjectId;
    companyId: Types.ObjectId;
    initialCash: number;
    notes?: string;
}

export interface CloseSessionData {
    sessionId: Types.ObjectId;
    finalCash: number;
    closedBy: Types.ObjectId;
    notes?: string;
}

export class CashSessionService {
  /**
   * Genera un número de sesión único para el día
   */
  async generateSessionNumber(companyId: Types.ObjectId): Promise<string> {
    try {
      const today = new Date();
      const dateString = today.toISOString().slice(0, 10).replace(/-/g, '');
      
      // Buscar el último número de sesión del día para esta empresa
      const lastSession = await CashSessionModel.findOne({
          company: companyId,
          sessionNumber: { $regex: `^${dateString}-` }
      }).sort({ sessionNumber: -1 });

      let sessionCount = 1;
      if (lastSession && lastSession.sessionNumber) {
          const lastNumber = parseInt(lastSession.sessionNumber.split('-')[1]) || 0;
          sessionCount = lastNumber + 1;
      }

      return `${dateString}-${sessionCount.toString().padStart(3, '0')}`;
    } catch (error) {
      console.error('[ERROR][generateSessionNumber]', error);
      throw new Error('Error generating session number');
    }
  }

  /**
   * Busca la sesión activa para un punto de venta
   */
  async findActiveSession(pointOfSalesId: Types.ObjectId, userId?: Types.ObjectId): Promise<ICashSession | null> {
    try {
      const query: any = {
          pointOfSales: pointOfSalesId,
          status: CashSessionStatus.OPEN
      };
      
      if (userId) {
          query.user = userId;
      }
      
      return await CashSessionModel.findOne(query).populate('user pointOfSales');
    } catch (error) {
      console.error('[ERROR][findActiveSession]', error);
      throw new Error('Error finding active session');
    }
  }

  /**
   * Busca sesiones por rango de fechas
   */
  async findSessionsByDateRange(filters: SessionFilters): Promise<ICashSession[]> {
    try {
      const query: any = {
          company: filters.companyId
      };
      
      if (filters.pointOfSalesId) {
          query.pointOfSales = filters.pointOfSalesId;
      }
      
      if (filters.userId) {
          query.user = filters.userId;
      }
      
      if (filters.status) {
          query.status = filters.status;
      }
      
      if (filters.dateRange) {
          query.startDate = {
              $gte: filters.dateRange.start,
              $lte: filters.dateRange.end
          };
      }
      
      return await CashSessionModel.find(query)
          .populate('user pointOfSales closedBy')
          .sort({ startDate: -1 });
    } catch (error) {
      console.error('[ERROR][findSessionsByDateRange]', error);
      throw new Error('Error finding sessions by date range');
    }
  }

  /**
   * Crea una nueva sesión de caja
   */
  async createSession(data: CreateSessionData): Promise<ICashSession> {
    try {
      // Verificar que no hay sesión activa
      const activeSession = await this.findActiveSession(data.pointOfSalesId, data.userId);
      if (activeSession) {
          throw new Error(`Active session already exists: ${activeSession.sessionNumber}`);
      }

      // Generar número de sesión
      const sessionNumber = await this.generateSessionNumber(data.companyId);

      // Crear nueva sesión
      const newSession = new CashSessionModel({
          pointOfSales: data.pointOfSalesId,
          user: data.userId,
          company: data.companyId,
          sessionNumber,
          initialCash: data.initialCash,
          notes: data.notes,
          status: CashSessionStatus.OPEN
      });

      await newSession.save();
      return await newSession.populate('user pointOfSales') as ICashSession;
    } catch (error) {
      console.error('[ERROR][createSession]', error);
      throw error;
    }
  }

  /**
   * Cierra una sesión de caja
   */
  async closeSession(data: CloseSessionData): Promise<ICashSession> {
    try {
      const session = await CashSessionModel.findById(data.sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      const pointOfSales = await PointOfSalesModel.findById(session.pointOfSales);

      if (!pointOfSales) {
        throw new Error('Point of sales not found');
      }

      if (session.status !== CashSessionStatus.OPEN) {
        throw new Error('Session is already closed');
      }

      // Calcular dinero esperado
      const expectedCash = await this.calculateExpectedCash(session._id as Types.ObjectId);
      
      // Calcular diferencia de caja
      const cashDifference = data.finalCash - expectedCash;

      // Actualizar sesión
      session.endDate = new Date();
      session.finalCash = data.finalCash;
      session.expectedCash = expectedCash;
      session.cashDifference = cashDifference;
      session.status = CashSessionStatus.CLOSED;
      session.closedBy = data.closedBy;
      pointOfSales.activeSession = null;
      
      if (data.notes) {
          session.notes = session.notes 
              ? `${session.notes}\nClosure notes: ${data.notes}` 
              : `Closure notes: ${data.notes}`;
      }

      await session.save();
      return await session.populate('user closedBy pointOfSales') as ICashSession;
    } catch (error) {
      console.error('[ERROR][closeSession]', error);
      throw error;
    }
  }

  /**
   * Calcula el dinero esperado en caja basado en las ventas
   */
  async calculateExpectedCash(sessionId: Types.ObjectId): Promise<number> {
      try {
          const cashSales = await OrderPointModel.aggregate([
              {
                  $match: {
                      sessionId: sessionId,
                      paymentMethod: '689b476d6106ddba8ab6666a', // ID del método de pago 'Efectivo'
                      status: OrderPointStatus.PAID
                  }
              },
              {
                  $group: {
                      _id: null,
                      total: { $sum: '$subtotal' }
                  }
              }
          ]);
          
          return cashSales[0]?.total || 0;
      } catch (error) {
          console.error('[ERROR][calculateExpectedCash]', error);
          return 0;
      }
  }

  /**
   * Obtiene estadísticas de una sesión
   */
  async getSessionStatistics(sessionId: Types.ObjectId): Promise<SessionStatistics> {
    try {
      // Aquí implementarías las consultas para obtener estadísticas
      // Por ahora retorno un placeholder
      
      /*
      Ejemplo de implementación:
      
      const orders = await OrderPointModel.find({
          sessionId: sessionId,
          status: { $in: ['COMPLETED', 'SERVED'] }
      });
      
      const totalOrders = orders.length;
      const totalSales = orders.reduce((sum, order) => sum + order.subtotal, 0);
      const cashSales = orders.filter(o => o.paymentMethod === 'CASH')
                              .reduce((sum, order) => sum + order.subtotal, 0);
      // ... más cálculos
      */
      
      return {
          totalOrders: 0,
          totalSales: 0,
          totalCashSales: 0,
          totalCardSales: 0,
          totalRefunds: 0,
          averageOrderValue: 0
      };
    } catch (error) {
      console.error('[ERROR][getSessionStatistics]', error);
      throw new Error('Error getting session statistics');
    }
  }

  /**
   * Valida si una sesión puede ser cerrada
   */
  canBeClosed(session: ICashSession): boolean {
    return session.status === CashSessionStatus.OPEN;
  }

  /**
   * Verifica si una sesión está activa
   */
  isActive(session: ICashSession): boolean {
    return session.status === CashSessionStatus.OPEN;
  }

  /**
   * Calcula la duración de una sesión en horas
   */
  getDurationInHours(session: ICashSession): number {
    const endTime = session.endDate || new Date();
    const startTime = session.startDate;
    return Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60) * 100) / 100;
  }

  /**
   * Verifica si el usuario tiene permisos sobre la sesión
   */
  async hasPermission(sessionId: Types.ObjectId, companyId: Types.ObjectId): Promise<boolean> {
    try {
      const session = await CashSessionModel.findById(sessionId).populate('pointOfSales');
      if (!session) return false;
      
      const pointOfSales = session.pointOfSales as any;
      return pointOfSales.company.toString() === companyId.toString();
    } catch (error) {
      console.error('[ERROR][hasPermission]', error);
      return false;
    }
  }

  /**
   * Obtiene resumen de múltiples sesiones
   */
  async getSessionsSummary(sessions: ICashSession[]): Promise<{
    totalSessions: number;
    openSessions: number;
    closedSessions: number;
    totalInitialCash: number;
    totalFinalCash: number;
    totalCashDifference: number;
    averageSessionDuration: number;
  }> {
    try {
      const totalSessions = sessions.length;
      const openSessions = sessions.filter(s => s.status === CashSessionStatus.OPEN).length;
      const closedSessions = sessions.filter(s => s.status === CashSessionStatus.CLOSED).length;
      
      const totalInitialCash = sessions.reduce((sum, s) => sum + s.initialCash, 0);
      const totalFinalCash = sessions.reduce((sum, s) => sum + (s.finalCash || 0), 0);
      const totalCashDifference = sessions.reduce((sum, s) => sum + (s.cashDifference || 0), 0);
      
      const closedSessionsWithDuration = sessions.filter(s => s.endDate);
      const averageSessionDuration = closedSessionsWithDuration.length > 0
          ? closedSessionsWithDuration.reduce((sum, s) => sum + this.getDurationInHours(s), 0) / closedSessionsWithDuration.length
          : 0;

      return {
          totalSessions,
          openSessions,
          closedSessions,
          totalInitialCash,
          totalFinalCash,
          totalCashDifference,
          averageSessionDuration: Math.round(averageSessionDuration * 100) / 100
      };
    } catch (error) {
      console.error('[ERROR][getSessionsSummary]', error);
      throw new Error('Error getting sessions summary');
    }
  }

  /**
   * Busca sesiones con paginación
   */
  async findSessionsWithPagination(
    filters: SessionFilters,
    page: number = 1,
    limit: number = 10
  ): Promise<{
    sessions: ICashSession[];
    total: number;
    totalPages: number;
    currentPage: number;
  }> {
    try {
      const skip = (page - 1) * limit;
      
      const query: any = {
          company: filters.companyId
      };
      
      if (filters.pointOfSalesId) {
          query.pointOfSales = filters.pointOfSalesId;
      }
      
      if (filters.userId) {
          query.user = filters.userId;
      }
      
      if (filters.status) {
          query.status = filters.status;
      }
      
      if (filters.dateRange) {
          query.startDate = {
              $gte: filters.dateRange.start,
              $lte: filters.dateRange.end
          };
      }

      const [sessions, total] = await Promise.all([
          CashSessionModel.find(query)
              .populate('user pointOfSales closedBy')
              .sort({ startDate: -1 })
              .skip(skip)
              .limit(limit),
          CashSessionModel.countDocuments(query)
      ]);

      return {
          sessions,
          total,
          totalPages: Math.ceil(total / limit),
          currentPage: page
      };
    } catch (error) {
      console.error('[ERROR][findSessionsWithPagination]', error);
      throw new Error('Error finding sessions with pagination');
    }
  }
}