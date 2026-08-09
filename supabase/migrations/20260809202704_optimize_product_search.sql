-- Search is executed inside Postgres so the browser only receives the requested
-- page instead of downloading the complete catalog and filtering it locally.

create extension if not exists pg_trgm with schema extensions;

create index if not exists idx_productos_nombre_trgm
  on public.productos using gin (lower(nombre) extensions.gin_trgm_ops);

create index if not exists idx_productos_id_trgm
  on public.productos using gin (lower(id) extensions.gin_trgm_ops);

create index if not exists idx_productos_codigo_barra_trgm
  on public.productos using gin (lower(codigo_barra) extensions.gin_trgm_ops);

create index if not exists idx_producto_codigos_barra_codigo_trgm
  on public.producto_codigos_barra using gin (lower(codigo_barra) extensions.gin_trgm_ops);

create or replace function public.buscar_productos_paginados(
  p_query text,
  p_categoria text default null,
  p_precio_min numeric default null,
  p_precio_max numeric default null,
  p_incluir_eliminados boolean default false,
  p_limit integer default 20,
  p_offset integer default 0
)
returns jsonb
language sql
stable
security invoker
-- productos RLS calls public.is_authorized(), whose body resolves
-- public.authorized_users through the caller's search path.
set search_path = 'public'
as $function$
  with parametros as (
    select
      lower(btrim(coalesce(p_query, ''))) as termino,
      nullif(btrim(coalesce(p_categoria, '')), '') as categoria,
      coalesce(p_incluir_eliminados, false) as incluir_eliminados,
      greatest(1, least(coalesce(p_limit, 20), 100))::integer as limite,
      greatest(0, coalesce(p_offset, 0))::integer as desplazamiento
  ),
  filtrados as materialized (
    select p.*
    from public.productos p
    cross join parametros prm
    where (prm.incluir_eliminados or p.estado <> 'eliminado')
      and (prm.categoria is null or p.categoria = prm.categoria)
      and (p_precio_min is null or p.precio_menor >= p_precio_min)
      and (p_precio_max is null or p.precio_menor <= p_precio_max)
      and (
        prm.termino = ''
        or (
          position(' ' in prm.termino) = 0
          and (
            lower(p.nombre) like '%' || prm.termino || '%'
            or lower(p.id) like '%' || prm.termino || '%'
            or lower(coalesce(p.codigo_barra, '')) like '%' || prm.termino || '%'
            or exists (
              select 1
              from public.producto_codigos_barra pcb
              where pcb.producto_id = p.id
                and lower(pcb.codigo_barra) like '%' || prm.termino || '%'
            )
          )
        )
        or (
          position(' ' in prm.termino) > 0
          and (
            not exists (
              select 1
              from unnest(regexp_split_to_array(prm.termino, '\s+')) as token(valor)
              where lower(p.nombre) not like '%' || token.valor || '%'
            )
            or lower(p.id) = prm.termino
            or lower(coalesce(p.codigo_barra, '')) = prm.termino
            or exists (
              select 1
              from public.producto_codigos_barra pcb
              where pcb.producto_id = p.id
                and lower(pcb.codigo_barra) = prm.termino
            )
          )
        )
      )
  ),
  pagina as (
    select f.*
    from filtrados f
    cross join parametros prm
    order by f.nombre asc, f.id asc
    limit (select limite from parametros)
    offset (select desplazamiento from parametros)
  ),
  pagina_con_codigos as (
    select
      pg.*,
      array(
        select codigos.codigo
        from (
          select nullif(btrim(pg.codigo_barra), '') as codigo, 0 as prioridad
          union all
          select nullif(btrim(pcb.codigo_barra), '') as codigo, 1 as prioridad
          from public.producto_codigos_barra pcb
          where pcb.producto_id = pg.id
        ) codigos
        where codigos.codigo is not null
        group by codigos.codigo
        order by min(codigos.prioridad), codigos.codigo
      ) as codigos_barra
    from pagina pg
  )
  select jsonb_build_object(
    'total', (select count(*) from filtrados),
    'productos', coalesce(
      (
        select jsonb_agg(to_jsonb(pc) order by pc.nombre asc, pc.id asc)
        from pagina_con_codigos pc
      ),
      '[]'::jsonb
    )
  );
$function$;

comment on function public.buscar_productos_paginados(text, text, numeric, numeric, boolean, integer, integer)
  is 'Busca y pagina productos en Postgres, incluyendo codigos de barra, sin transferir el catalogo completo al cliente.';

revoke all on function public.buscar_productos_paginados(text, text, numeric, numeric, boolean, integer, integer) from public;
revoke all on function public.buscar_productos_paginados(text, text, numeric, numeric, boolean, integer, integer) from anon;
grant execute on function public.buscar_productos_paginados(text, text, numeric, numeric, boolean, integer, integer) to authenticated;
grant execute on function public.buscar_productos_paginados(text, text, numeric, numeric, boolean, integer, integer) to service_role;
