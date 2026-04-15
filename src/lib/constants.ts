import type { OrderStatus, InvoiceStatus, SupplierStatus } from "@/types";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  DRAFT: "Draft",
  CONFIRMED: "Confirmed",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  DRAFT: "secondary",
  CONFIRMED: "info",
  SHIPPED: "warning",
  DELIVERED: "success",
  CANCELLED: "destructive",
};

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  APPROVED: "Approved",
  PAID: "Paid",
  REJECTED: "Rejected",
};

export const INVOICE_STATUS_COLORS: Record<InvoiceStatus, string> = {
  DRAFT: "secondary",
  SUBMITTED: "info",
  APPROVED: "warning",
  PAID: "success",
  REJECTED: "destructive",
};

export const SUPPLIER_STATUS_LABELS: Record<SupplierStatus, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export const SUPPLIER_STATUS_COLORS: Record<SupplierStatus, string> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "destructive",
};
