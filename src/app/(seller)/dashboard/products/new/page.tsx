import dynamic from "next/dynamic";
import LoadingSkeleton from "./loading";

const AddProductClient = dynamic(
  () =>
    import("@/components/seller/product-upload/AddProductClient").then(
      (m) => ({ default: m.AddProductClient })
    ),
  { loading: () => <LoadingSkeleton />, ssr: false }
);

export const metadata = {
  title: "Add New Product – NexCart Seller Dashboard",
};

export default function NewProductPage() {
  return (
    <div className="py-6 px-4 sm:px-6 lg:py-10 lg:px-12">
      <AddProductClient />
    </div>
  );
}
