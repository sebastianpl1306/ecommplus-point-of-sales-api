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
      required: true
    }
  }, { timestamps: true });
  
  export const OrderPointModel = model<OrderPoint>("OrderPoint", OrderPointSchema);