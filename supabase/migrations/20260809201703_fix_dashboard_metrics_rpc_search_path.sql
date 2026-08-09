-- La politica RLS de productos llama a is_authorized(), que actualmente
-- referencia authorized_users sin calificar el esquema. Un search_path vacio
-- impide resolver esa tabla durante la evaluacion de la politica.
alter function public.obtener_estadisticas_dashboard()
set search_path = 'public';
