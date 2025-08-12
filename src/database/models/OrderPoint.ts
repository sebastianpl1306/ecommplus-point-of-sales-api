import { model, Schema, Types } from "mongoose";
import { ProductsOrderPointSchema } from "./complements";
import { OrderPoint, OrderPointStatus } from "../../interfaces";

export const OrderPointSchema = new Schema({
    table: {
      type: Types.ObjectId,
      ref: "Table",
      required: false
    },
    products: [ ProductsOrderPointSchema ],
    status: { 
      type: String, 
      enum: OrderPointStatus, 
      default: OrderPointStatus.PENDING
    },
    subtotal: {
      type: Number,
      required: true
    },
    pointOfSales: {
      type: Types.ObjectId,
      ref: "PointOfSales",
      required: true
    },
    user: {
      type: Types.ObjectId,
      ref: "User",
      required: false
    },
    paymentMethod: {
      type: Types.ObjectId,
      ref: "PaymentMethod"
    },
    discount: {
      type: Number,
      required: false,
      default: 0
    },
    total: {
      type: Number,
      required: true,
      default: 0
    },
    processedAt: {
      type: Date,
      required: false
    },
    processedBy: {
      type: Types.ObjectId,
      ref: "User",
      required: false
    },
    notes: {
      type: String,
      required: false
    }
  }, { timestamps: true });
  
  export const OrderPointModel = model<OrderPoint>("OrderPoint", OrderPointSchema);