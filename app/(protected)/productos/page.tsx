import PriceConsultationView from "@/components/price-consultation-view"
import {
  deleteProductImage,
  searchProductImage,
  setManualProductImage,
  uploadProductImage,
} from "@/app/actions/image-search-actions"

export default function ProductosPage() {
  return (
    <PriceConsultationView
      searchProductImage={searchProductImage}
      uploadProductImage={uploadProductImage}
      setManualProductImage={setManualProductImage}
      deleteProductImage={deleteProductImage}
    />
  )
}
