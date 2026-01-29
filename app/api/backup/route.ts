import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { generateExcel } from "@/scripts/backup/excel-generator";
import type { ExportData } from "@/scripts/backup/supabase-export";

export const maxDuration = 60;

export async function POST() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {},
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // Verificar que es usuario autorizado (admin)
    const { data: authorizedUser } = await supabase
      .from("authorized_users")
      .select("role")
      .eq("email", user.email!)
      .single();

    if (!authorizedUser || authorizedUser.role !== "admin") {
      return NextResponse.json(
        { error: "No autorizado. Solo administradores pueden ejecutar backups." },
        { status: 403 }
      );
    }

    // Exportar todos los productos paginando (Supabase limita a 1000 por query)
    const PAGE_SIZE = 1000;
    const allProductos: any[] = [];
    let from = 0;
    while (true) {
      const { data: batch, error: prodError } = await supabase
        .from("productos")
        .select(
          "id, nombre, categoria, costo, precio_mayor, precio_menor, unidad, codigo_barra, descripcion, peso_neto, volumen_neto, permite_venta_fraccionada, estado, created_at, updated_at"
        )
        .in("estado", ["activo", "inactivo"])
        .order("nombre")
        .range(from, from + PAGE_SIZE - 1);

      if (prodError) {
        return NextResponse.json(
          { error: `Error exportando productos: ${prodError.message}` },
          { status: 500 }
        );
      }

      allProductos.push(...(batch || []));
      if (!batch || batch.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }

    // Exportar ventas del ultimo mes (paginado)
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const allVentas: any[] = [];
    from = 0;
    while (true) {
      const { data: batch, error: ventasError } = await supabase
        .from("ventas")
        .select(
          "id, created_at, tipo_venta, total, metodo_pago, cliente_nombre, productos, subtotal, descuento_global, descuento_global_porcentaje, descuento_global_motivo"
        )
        .gte("created_at", oneMonthAgo.toISOString())
        .order("created_at", { ascending: false })
        .range(from, from + PAGE_SIZE - 1);

      if (ventasError) {
        return NextResponse.json(
          { error: `Error exportando ventas: ${ventasError.message}` },
          { status: 500 }
        );
      }

      allVentas.push(...(batch || []));
      if (!batch || batch.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }

    const data: ExportData = {
      productos: allProductos,
      ventas: allVentas,
      exportDate: new Date().toISOString(),
    };

    const excelBuffer = await generateExcel(data);
    const fileName = `backup-precios-${new Date().toISOString().split("T")[0]}.xlsx`;

    return new NextResponse(excelBuffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error("Error en backup manual:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Error desconocido al ejecutar el backup",
      },
      { status: 500 }
    );
  }
}
