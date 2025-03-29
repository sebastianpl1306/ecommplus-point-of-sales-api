import { model, Schema, Types } from "mongoose";
import { Table, TableStatus } from "../../interfaces";

export const TableSchema = new Schema({
  number: {
    type: Number,
    required: true,
    unique: true
  },
  capacity: {
    type: Number,
    required: true
  },
  status: {
    type: String, 
    enum: [TableStatus.FREE, TableStatus.IN_USE, TableStatus.RESERVED], 
    default: TableStatus.FREE 
  },
  activeOrderPoint: {
    ref: 'OrderPoint',
    type: Types.ObjectId,
    default: null
  },
  pointOfSales: {
    type: Types.ObjectId,
    ref: 'PointOfSales',
    required: true
  }
});

export const TableModel = model<Table>("Table", TableSchema);