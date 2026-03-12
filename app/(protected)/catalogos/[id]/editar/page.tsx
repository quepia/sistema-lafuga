import { CatalogoWizard } from "@/components/catalogos/CatalogoWizard"

interface EditarCatalogoPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function EditarCatalogoPage({ params }: EditarCatalogoPageProps) {
  const { id } = await params

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Editar Catálogo</h1>
      <CatalogoWizard catalogoId={id} />
    </div>
  )
}
