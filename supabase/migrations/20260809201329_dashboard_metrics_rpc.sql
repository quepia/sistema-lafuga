-- Calcula todas las metricas del dashboard en una sola consulta.
-- SECURITY INVOKER conserva las politicas RLS de productos para quien llama.
create or replace function public.obtener_estadisticas_dashboard()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $function$
  with productos_visibles as (
    select
      categoria,
      precio_menor,
      precio_mayor,
      costo,
      codigo_barra
    from public.productos
  ),
  resumen as (
    select
      count(*) as total_productos,
      count(*) filter (
        where coalesce(precio_menor, 0) = 0
          and coalesce(precio_mayor, 0) = 0
      ) as productos_sin_precio,
      count(*) filter (
        where codigo_barra is null or codigo_barra = ''
      ) as productos_sin_codigo_barra,
      round(coalesce(avg(precio_menor) filter (where precio_menor > 0), 0), 2) as promedio_precio_menor,
      round(coalesce(avg(precio_mayor) filter (where precio_mayor > 0), 0), 2) as promedio_precio_mayor,
      round(coalesce(avg(costo) filter (where costo > 0), 0), 2) as promedio_costo
    from productos_visibles
  ),
  categorias as (
    select coalesce(
      jsonb_object_agg(categoria, cantidad order by categoria),
      '{}'::jsonb
    ) as productos_por_categoria
    from (
      select
        coalesce(nullif(categoria, ''), 'Sin categoría') as categoria,
        count(*) as cantidad
      from productos_visibles
      group by 1
    ) agrupadas
  )
  select jsonb_build_object(
    'total_productos', resumen.total_productos,
    'productos_por_categoria', categorias.productos_por_categoria,
    'productos_sin_precio', resumen.productos_sin_precio,
    'productos_sin_codigo_barra', resumen.productos_sin_codigo_barra,
    'promedio_precio_menor', resumen.promedio_precio_menor,
    'promedio_precio_mayor', resumen.promedio_precio_mayor,
    'promedio_costo', resumen.promedio_costo
  )
  from resumen
  cross join categorias;
$function$;

revoke all on function public.obtener_estadisticas_dashboard() from public;
revoke all on function public.obtener_estadisticas_dashboard() from anon;
grant execute on function public.obtener_estadisticas_dashboard() to authenticated;
grant execute on function public.obtener_estadisticas_dashboard() to service_role;
