import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { exportFromSupabase } from "@/scripts/backup/supabase-export";
import { generateExcel } from "@/scripts/backup/excel-generator";
import { uploadToDrive } from "@/scripts/backup/google-drive-upload";

export const maxDuration = 60;

export async function POST() {
  try {
    // Verificar autenticacion
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

    // Verificar que las variables de entorno estan configuradas
    if (!process.env.SUPABASE_SERVICE_KEY) {
      return NextResponse.json(
        { error: "SUPABASE_SERVICE_KEY no configurada en el servidor" },
        { status: 500 }
      );
    }
    if (!process.env.GOOGLE_CREDENTIALS) {
      return NextResponse.json(
        { error: "GOOGLE_CREDENTIALS no configurada en el servidor" },
        { status: 500 }
      );
    }
    if (!process.env.GOOGLE_DRIVE_FOLDER_ID) {
      return NextResponse.json(
        { error: "GOOGLE_DRIVE_FOLDER_ID no configurada en el servidor" },
        { status: 500 }
      );
    }

    // Ejecutar backup
    const data = await exportFromSupabase();
    const excelBuffer = await generateExcel(data);

    const fileName = `backup-precios-${new Date().toISOString().split("T")[0]}.xlsx`;
    const fileId = await uploadToDrive(excelBuffer, fileName);

    return NextResponse.json({
      success: true,
      fileName,
      fileId,
      stats: {
        productos: data.productos.length,
        ventas: data.ventas.length,
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
