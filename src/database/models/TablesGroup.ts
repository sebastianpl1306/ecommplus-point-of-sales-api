import { model, Schema, Types } from "mongoose";
import { TablesGroup } from "../../interfaces";

export const TablesGroupSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  pointOfSales: {
    type: Types.ObjectId,
    ref: 'PointOfSales',
    required: true
  }
});

export const TablesGroupModel = model<TablesGroup>("TablesGroup", TablesGroupSchema);