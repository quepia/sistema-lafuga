-- Keep product search consistent for accented/unaccented text, punctuation,
-- repeated whitespace and multi-word queries. The immutable wrapper lets the
-- normalized expressions use trigram indexes.

create extension if not exists unaccent with schema extensions;

create or replace function public.normalizar_busqueda(valor text)
returns text
language sql
immutable
strict
parallel safe
set search_path = ''
as $function$
  select btrim(
    regexp_replace(
      lower(extensions.unaccent('extensions.unaccent'::regdictionary, valor)),
      '[^[:alnum:]]+',
      ' ',
      'g'
    )
  );
$function$;

comment on function public.normalizar_busqueda(text)
  is 'Normaliza texto para busquedas: minusculas, sin diacriticos, sin signos y con espacios simples.';

revoke all on function public.normalizar_busqueda(text) from public;
revoke all on function public.normalizar_busqueda(text) from anon;
grant execute on function public.normalizar_busqueda(text) to authenticated;
grant execute on function public.normalizar_busqueda(text) to service_role;

create index if not exists idx_productos_nombre_busqueda_trgm
  on public.productos using gin (public.normalizar_busqueda(nombre) extensions.gin_trgm_ops);

create index if not exists idx_productos_categoria_busqueda_trgm
  on public.productos using gin (public.normalizar_busqueda(categoria) extensions.gin_trgm_ops);

create index if not exists idx_productos_id_busqueda_trgm
  on public.productos using gin (public.normalizar_busqueda(id) extensions.gin_trgm_ops);

create index if not exists idx_productos_codigo_barra_busqueda_trgm
  on public.productos using gin (public.normalizar_busqueda(codigo_barra) extensions.gin_trgm_ops);

create index if not exists idx_producto_codigos_barra_busqueda_trgm
  on public.producto_codigos_barra using gin (public.normalizar_busqueda(codigo_barra) extensions.gin_trgm_ops);

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
      public.normalizar_busqueda(coalesce(p_query, '')) as termino,
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
            public.normalizar_busqueda(p.nombre) like '%' || prm.termino || '%'
            or coalesce(public.normalizar_busqueda(p.categoria), '') like '%' || prm.termino || '%'
            or public.normalizar_busqueda(p.id) like '%' || prm.termino || '%'
            or coalesce(public.normalizar_busqueda(p.codigo_barra), '') like '%' || prm.termino || '%'
            or exists (
              select 1
              from public.producto_codigos_barra pcb
              where pcb.producto_id = p.id
                and public.normalizar_busqueda(pcb.codigo_barra) like '%' || prm.termino || '%'
            )
          )
        )
        or (
          position(' ' in prm.termino) > 0
          and not exists (
            select 1
            from unnest(regexp_split_to_array(prm.termino, '\s+')) as token(valor)
            where not (
              public.normalizar_busqueda(p.nombre) like '%' || token.valor || '%'
              or coalesce(public.normalizar_busqueda(p.categoria), '') like '%' || token.valor || '%'
              or public.normalizar_busqueda(p.id) like '%' || token.valor || '%'
              or coalesce(public.normalizar_busqueda(p.codigo_barra), '') like '%' || token.valor || '%'
              or exists (
                select 1
                from public.producto_codigos_barra pcb
                where pcb.producto_id = p.id
                  and public.normalizar_busqueda(pcb.codigo_barra) like '%' || token.valor || '%'
              )
            )
          )
        )
      )
  ),
  pagina as (
    select
      f.*,
      case
        when public.normalizar_busqueda(f.id) = prm.termino
          or public.normalizar_busqueda(f.codigo_barra) = prm.termino
          or exists (
            select 1
            from public.producto_codigos_barra pcb
            where pcb.producto_id = f.id
              and public.normalizar_busqueda(pcb.codigo_barra) = prm.termino
          ) then 0
        when public.normalizar_busqueda(f.nombre) = prm.termino then 1
        when public.normalizar_busqueda(f.nombre) like prm.termino || '%' then 2
        when public.normalizar_busqueda(f.categoria) = prm.termino then 3
        else 4
      end as _search_rank
    from filtrados f
    cross join parametros prm
    order by _search_rank asc, f.nombre asc, f.id asc
    limit (select limite from parametros)
    offset (select desplazamiento from parametros)
  ),
  pagina_con_codigos as (
    select
      (
        (to_jsonb(pg) - '_search_rank')
        || jsonb_build_object(
          'codigos_barra',
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
          )
        )
      ) as producto,
      pg._search_rank,
      pg.nombre,
      pg.id
    from pagina pg
  )
  select jsonb_build_object(
    'total', (select count(*) from filtrados),
    'productos', coalesce(
      (
        select jsonb_agg(pc.producto order by pc._search_rank asc, pc.nombre asc, pc.id asc)
        from pagina_con_codigos pc
      ),
      '[]'::jsonb
    )
  );
$function$;

comment on function public.buscar_productos_paginados(text, text, numeric, numeric, boolean, integer, integer)
  is 'Busca productos sin distinguir tildes, mayusculas o signos; admite multiples palabras y ordena por relevancia.';

revoke all on function public.buscar_productos_paginados(text, text, numeric, numeric, boolean, integer, integer) from public;
revoke all on function public.buscar_productos_paginados(text, text, numeric, numeric, boolean, integer, integer) from anon;
grant execute on function public.buscar_productos_paginados(text, text, numeric, numeric, boolean, integer, integer) to authenticated;
grant execute on function public.buscar_productos_paginados(text, text, numeric, numeric, boolean, integer, integer) to service_role;
