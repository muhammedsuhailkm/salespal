import { PageHeader } from "@/components/layout/PageHeader";
import { OrderForm } from "@/components/orders/OrderForm";

export default function NewOrderPage() {
  return (
    <>
      <PageHeader title="Add Order" subtitle="Create a new shipment order for one of your clients." />
      <OrderForm />
    </>
  );
}
