"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Plus, Trash2, Shield, User, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "sonner"

interface AuthorizedUser {
    id: string
    email: string
    role: 'admin' | 'editor' | 'vendedor' | 'supervisor' | 'gerente'
    created_at: string
}

export default function UsersSettingsPage() {
    const { user } = useAuth() // AuthContext already provides role
    const [users, setUsers] = useState<AuthorizedUser[]>([])
    const [loading, setLoading] = useState(true)
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
    const [newUserEmail, setNewUserEmail] = useState("")
    const [newUserRole, setNewUserRole] = useState<string>("vendedor")
    const [submitting, setSubmitting] = useState(false)

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const fetchUsers = async () => {
        try {
            const { data, error } = await supabase
                .from("authorized_users")
                .select("*")
                .order("created_at", { ascending: false })

            if (error) throw error
            setUsers(data || [])
        } catch (error) {
            console.error("Error fetching users:", error)
            toast.error("Error al cargar usuarios")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchUsers()
    }, [])

    const handleAddUser = async () => {
        if (!newUserEmail.trim()) {
            toast.error("El email es requerido")
            return
        }

        setSubmitting(true)
        try {
            const { error } = await supabase.from("authorized_users").insert({
                email: newUserEmail.trim(),
                role: newUserRole,
            })

            if (error) {
                if (error.code === '23505') { // Unique violation
                    toast.error("Este usuario ya está autorizado")
                } else {
                    throw error
                }
                return
            }

            toast.success("Usuario agregado correctamente")
            setIsAddDialogOpen(false)
            setNewUserEmail("")
            setNewUserRole("vendedor")
            fetchUsers()
        } catch (error) {
            console.error("Error adding user:", error)
            toast.error("Error al agregar usuario")
        } finally {
            setSubmitting(false)
        }
    }

    const handleDeleteUser = async (id: string, email: string) => {
        if (email === "lautarolopezlabrin@gmail.com") {
            toast.error("No se puede eliminar al Super Admin")
            return
        }

        if (!confirm(`¿Estás seguro de que deseas eliminar el acceso a ${email}?`)) {
            return
        }

        try {
            const { error } = await supabase.from("authorized_users").delete().eq("id", id)
            if (error) throw error

            toast.success("Acceso revocado")
            fetchUsers()
        } catch (error) {
            console.error("Error deleting user:", error)
            toast.error("Error al eliminar usuario")
        }
    }

    // Double check authorization (Middleware handles it but UI safety is good)
    // If useAuth hasn't loaded role yet or role is not admin, we might show loading or unauthorized
    if (user?.role !== 'admin') {
        // Return null or access denied view (though middleware should block this page)
        // We'll show access denied just in case
        return (
            <div className="p-8 text-center text-red-600">
                <Shield className="h-12 w-12 mx-auto mb-4" />
                <h2 className="text-xl font-bold">Acceso Restringido</h2>
                <p>Solo administradores pueden ver esta página.</p>
            </div>
        )
    }

    return (
        <div className="container mx-auto py-8 px-4 max-w-5xl">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Gestión de Usuarios</h1>
                    <p className="text-gray-500 mt-1">Administra quién tiene acceso al sistema.</p>
                </div>

                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-[#006AC0] hover:bg-[#005a9e]">
                            <Plus className="h-4 w-4 mr-2" />
                            Agregar Usuario
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Autorizar Nuevo Usuario</DialogTitle>
                            <DialogDescription>
                                Ingresa el email de la cuenta de Google que deseas autorizar.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Email (Google Account)</label>
                                <Input
                                    placeholder="usuario@gmail.com"
                                    type="email"
                                    value={newUserEmail}
                                    onChange={(e) => setNewUserEmail(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Rol</label>
                                <Select value={newUserRole} onValueChange={setNewUserRole}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="vendedor">Vendedor</SelectItem>
                                        <SelectItem value="supervisor">Supervisor</SelectItem>
                                        <SelectItem value="gerente">Gerente</SelectItem>
                                        <SelectItem value="editor">Editor</SelectItem>
                                        <SelectItem value="admin">Administrador</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancelar</Button>
                            <Button onClick={handleAddUser} disabled={submitting}>
                                {submitting ? "Guardando..." : "Autorizar"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="bg-white rounded-lg shadow border overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Usuario</TableHead>
                            <TableHead>Rol</TableHead>
                            <TableHead>Fecha Alta</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.map((u) => (
                            <TableRow key={u.id}>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                                            <User className="h-4 w-4 text-gray-500" />
                                        </div>
                                        <span className="font-medium">{u.email}</span>
                                        {u.email === user?.email && <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded ml-2">(Tú)</span>}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                    ${u.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                                            u.role === 'supervisor' ? 'bg-orange-100 text-orange-800' :
                                                'bg-green-100 text-green-800'}`}>
                                        {u.role.toUpperCase()}
                                    </span>
                                </TableCell>
                                <TableCell className="text-gray-500">
                                    {new Date(u.created_at).toLocaleDateString()}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                        disabled={u.email === "lautarolopezlabrin@gmail.com"}
                                        onClick={() => handleDeleteUser(u.id, u.email)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {!loading && users.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                    No hay usuarios autorizados (Esto no debería pasar si estás viendo esto).
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="mt-8 flex gap-4">
                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Importante</AlertTitle>
                    <AlertDescription>
                        Solo los usuarios listados aquí podrán iniciar sesión con su cuenta de Google.
                        Cualquier otro intento de inicio de sesión será bloqueado.
                    </AlertDescription>
                </Alert>
            </div>
        </div>
    )
}
