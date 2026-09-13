import {
  CaretDownIcon,
  CheckIcon,
  FunnelSimpleIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  XIcon,
} from "@phosphor-icons/react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function ListFilterBar({
  children,
  actions,
  summary,
}: {
  children: ReactNode;
  actions?: ReactNode;
  summary?: ReactNode;
}) {
  return (
    <div className="@container/filters flex min-h-14 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b pb-2">
      {summary}
      <div className="ml-auto flex min-w-0 max-w-full flex-wrap items-center justify-end gap-1 rounded-lg bg-muted/30 p-1">
        {children}
        {actions}
      </div>
    </div>
  );
}

// Rascunho local; mudança externa (histórico/limpar) cancela o envio anterior.
export function ListSearch({
  value,
  onChange,
  label,
  maxLength = 120,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  maxLength?: number;
}) {
  const [draft, setDraft] = useState(value);
  const [expanded, setExpanded] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (expanded) {
      input.current?.focus();
    }
  }, [expanded]);
  const pending = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const callback = useRef(onChange);
  callback.current = onChange;
  useEffect(() => {
    clearTimeout(pending.current);
    setDraft(value);
  }, [value]);
  useEffect(() => () => clearTimeout(pending.current), []);
  if (!(expanded || value)) {
    return (
      <Button
        aria-label="Buscar na lista"
        className="size-11"
        onClick={() => setExpanded(true)}
        ref={opener}
        size="icon"
        variant="ghost"
      >
        <MagnifyingGlassIcon aria-hidden />
      </Button>
    );
  }
  return (
    <div className="relative w-64 min-w-0 max-w-full">
      <MagnifyingGlassIcon
        aria-hidden
        className="pointer-events-none absolute top-3 left-3 size-5 text-muted-foreground"
      />
      <Input
        aria-label={label}
        className="h-11 pr-11 pl-10 [&::-webkit-search-cancel-button]:appearance-none"
        maxLength={maxLength}
        onChange={(event) => {
          const next = event.target.value;
          setDraft(next);
          clearTimeout(pending.current);
          pending.current = setTimeout(
            () => callback.current(next.trim()),
            300
          );
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape" && !draft) {
            setExpanded(false);
            requestAnimationFrame(() => opener.current?.focus());
          }
          if (event.key === "Enter") {
            clearTimeout(pending.current);
            callback.current(draft.trim());
          }
        }}
        placeholder={label}
        ref={input}
        type="search"
        value={draft}
      />
      <Button
        aria-label="Limpar e recolher busca"
        className="absolute top-0 right-0 size-11 rounded-full text-muted-foreground hover:bg-transparent hover:text-foreground focus-visible:ring-inset [&_svg]:size-4"
        onClick={() => {
          clearTimeout(pending.current);
          setDraft("");
          onChange("");
          setExpanded(false);
          requestAnimationFrame(() => opener.current?.focus());
        }}
        size="icon"
        variant="ghost"
      >
        <XIcon aria-hidden />
      </Button>
    </div>
  );
}

export interface FilterOption {
  disabled?: boolean;
  label: string;
  value: string;
}
export function ListFacet({
  label,
  options,
  selected,
  onChange,
  onOpenChange,
  onSearchChange,
  loading = false,
  error,
  onRetry,
  maxSelected,
  summary,
  mode = "multiple",
  searchable = true,
}: {
  label: string;
  summary?: string;
  options: FilterOption[];
  selected: string[];
  onChange: (value: string[]) => void;
  onOpenChange?: (open: boolean) => void;
  onSearchChange?: (value: string) => void;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  maxSelected?: number;
  mode?: "single" | "multiple";
  searchable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const [container, setContainer] = useState<HTMLElement | null>(null);
  return (
    <Popover
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        setContainer(
          trigger.current?.closest<HTMLElement>(
            '[data-slot="list-filter-panel"], dialog'
          ) ?? null
        );
        onOpenChange?.(nextOpen);
      }}
      open={open}
    >
      <PopoverTrigger asChild>
        <Button
          aria-label={`Escolher ${label.toLowerCase()}`}
          className="h-11 w-full min-w-0 justify-between px-3"
          ref={trigger}
          variant="outline"
        >
          <span className="truncate">{summary ?? "Selecionar…"}</span>
          <CaretDownIcon aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent container={container}>
        {searchable ? (
          <Command shouldFilter={!onSearchChange}>
            {searchable && (
              <CommandInput
                aria-label={`Buscar ${label.toLowerCase()}`}
                {...(onSearchChange ? { onValueChange: onSearchChange } : {})}
                maxLength={120}
                placeholder={`Buscar ${label.toLowerCase()}…`}
              />
            )}
            {loading && (
              <p
                className="px-3 py-2 text-muted-foreground text-xs"
                role="status"
              >
                Buscando opções…
              </p>
            )}
            {error ? (
              <div className="p-2">
                <p className="text-sm">Não foi possível carregar as opções.</p>
                <Button onClick={onRetry} variant="ghost">
                  Tentar novamente
                </Button>
              </div>
            ) : (
              <CommandList aria-label={label}>
                {!loading && (
                  <CommandEmpty>Nenhuma opção encontrada.</CommandEmpty>
                )}
                {options.map((option) => (
                  <CommandItem
                    disabled={
                      loading ||
                      option.disabled ||
                      (maxSelected !== undefined &&
                        selected.length >= maxSelected &&
                        !selected.includes(option.value))
                    }
                    key={option.value}
                    keywords={[option.label]}
                    onSelect={() => {
                      if (mode === "single") {
                        onChange([option.value]);
                        setOpen(false);
                        onOpenChange?.(false);
                        return;
                      }
                      onChange(
                        selected.includes(option.value)
                          ? selected.filter((value) => value !== option.value)
                          : [...selected, option.value]
                      );
                    }}
                    value={option.value}
                  >
                    <span
                      aria-hidden
                      className={`flex size-4 shrink-0 items-center justify-center ${mode === "multiple" ? "rounded border" : ""}`}
                    >
                      {selected.includes(option.value) && (
                        <CheckIcon className="size-3" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1 truncate">
                      {option.label}
                    </span>
                    <span className="sr-only">
                      {selected.includes(option.value)
                        ? "Selecionado"
                        : "Não selecionado"}
                    </span>
                  </CommandItem>
                ))}
              </CommandList>
            )}
          </Command>
        ) : (
          <div className="space-y-1 p-1">
            {options.map((option) => (
              <Button
                aria-pressed={selected.includes(option.value)}
                className="h-11 w-full justify-start"
                disabled={
                  loading ||
                  option.disabled ||
                  (mode === "multiple" &&
                    maxSelected !== undefined &&
                    selected.length >= maxSelected &&
                    !selected.includes(option.value))
                }
                key={option.value}
                onClick={() => {
                  onChange(
                    mode === "single"
                      ? [option.value]
                      : selected.includes(option.value)
                        ? selected.filter((value) => value !== option.value)
                        : [...selected, option.value]
                  );
                  if (mode === "single") {
                    setOpen(false);
                    onOpenChange?.(false);
                  }
                }}
                variant="ghost"
              >
                <span
                  aria-hidden
                  className="flex size-4 shrink-0 items-center justify-center"
                >
                  {selected.includes(option.value) && (
                    <CheckIcon className="size-4" />
                  )}
                </span>
                {option.label}
              </Button>
            ))}
          </div>
        )}
        {mode === "multiple" && (
          <div className="flex items-center justify-between gap-2 border-t px-2 pt-1">
            <Button
              className="h-11 text-muted-foreground"
              disabled={selected.length === 0}
              onClick={() => onChange([])}
              size="sm"
              variant="ghost"
            >
              Limpar seleção
            </Button>
            <Button
              className="h-11"
              onClick={() => {
                setOpen(false);
                onOpenChange?.(false);
              }}
              size="sm"
              variant="ghost"
            >
              Concluído
            </Button>
          </div>
        )}
        {maxSelected !== undefined && selected.length >= maxSelected && (
          <p className="px-3 py-2 text-muted-foreground text-xs">
            Limite de {maxSelected} opções selecionadas.
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}

export interface ListFilterCondition {
  control: ReactNode;
  id: string;
  label: string;
  onRemove: () => void;
  operator: string;
}

export function ListFilterPanel({
  count,
  conditions,
  available,
  onAdd,
  onClear,
}: {
  count: number;
  conditions: ListFilterCondition[];
  available: { id: string; label: string }[];
  onAdd: (id: string) => void;
  onClear: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const content = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [container, setContainer] = useState<HTMLElement | null>(null);
  return (
    <Popover
      onOpenChange={(open) => {
        setContainer(trigger.current?.closest("dialog") ?? null);
        if (!open) {
          setAdding(false);
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          className="h-11 gap-2 rounded-md px-3 text-muted-foreground data-[state=open]:bg-accent data-[state=open]:text-foreground"
          ref={trigger}
          variant={count ? "soft" : "ghost"}
        >
          <FunnelSimpleIcon aria-hidden />
          Filtrar
          {count > 0 && (
            <span className="flex size-5 items-center justify-center rounded bg-primary/10 font-medium text-primary text-xs">
              {count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="@container/conditions w-[560px] rounded-xl p-0 shadow-xl"
        container={container}
        data-slot="list-filter-panel"
        ref={content}
      >
        <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
          <div className="space-y-1">
            <h3 className="font-semibold text-sm">Filtros da visualização</h3>
            <p className="text-muted-foreground text-xs">
              {conditions.length > 1
                ? "Os resultados devem atender a todos os filtros."
                : "Escolha o que você quer encontrar nesta lista."}
            </p>
          </div>
          {count > 0 && (
            <Button
              className="h-11 px-2 text-muted-foreground"
              onClick={() => {
                onClear();
                setAdding(false);
              }}
              size="sm"
              variant="ghost"
            >
              Limpar
            </Button>
          )}
        </div>
        {conditions.length ? (
          <div className="px-4 py-2">
            <div
              aria-hidden="true"
              className="@min-[480px]/conditions:grid hidden grid-cols-[140px_56px_minmax(0,1fr)_44px] gap-2 px-1 py-2 font-medium text-[11px] text-muted-foreground"
            >
              <span>Propriedade</span>
              <span>Condição</span>
              <span>Valor</span>
              <span />
            </div>
            <div className="divide-y">
              {conditions.map((condition) => (
                <div
                  className="grid @min-[480px]/conditions:grid-cols-[140px_56px_minmax(0,1fr)_44px] grid-cols-[minmax(0,1fr)_auto_44px] items-center gap-x-2 gap-y-1 px-1 py-3"
                  data-condition={condition.id}
                  key={condition.id}
                >
                  <span className="flex min-h-11 items-center gap-2 font-medium text-sm">
                    <span>{condition.label}</span>
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {condition.operator}
                  </span>
                  <div className="@min-[480px]/conditions:col-span-1 col-span-3 @min-[480px]/conditions:col-start-3 col-start-1 @min-[480px]/conditions:row-start-1 row-start-2 min-w-0">
                    {condition.control}
                  </div>
                  <Button
                    aria-label={`Remover filtro de ${condition.label.toLowerCase()}`}
                    className="@min-[480px]/conditions:col-start-4 col-start-3 row-start-1 size-11 text-muted-foreground"
                    onClick={() => {
                      condition.onRemove();
                      requestAnimationFrame(() =>
                        content.current
                          ?.querySelector<HTMLButtonElement>("button")
                          ?.focus()
                      );
                    }}
                    size="icon"
                    variant="ghost"
                  >
                    <XIcon aria-hidden />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3 px-5 py-6">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-muted/30">
              <FunnelSimpleIcon
                aria-hidden
                className="size-4 text-muted-foreground"
              />
            </span>
            <div className="space-y-1">
              <p className="font-medium text-sm">Nenhum filtro adicionado</p>
              <p className="text-muted-foreground text-xs">
                Escolha uma propriedade para criar a primeira condição.
              </p>
            </div>
          </div>
        )}
        {available.length > 0 && (
          <div className="border-t bg-muted/20 p-2">
            {adding || conditions.length === 0 ? (
              <div className="space-y-1 p-1">
                <p className="px-2 pb-1 font-medium text-[11px] text-muted-foreground">
                  Escolha uma propriedade
                </p>
                {available.map((option) => (
                  <Button
                    className="h-11 w-full justify-start"
                    data-add-property=""
                    key={option.id}
                    onClick={() => {
                      onAdd(option.id);
                      setAdding(false);
                      requestAnimationFrame(() => {
                        const row = Array.from(
                          content.current?.querySelectorAll<HTMLElement>(
                            "[data-condition]"
                          ) ?? []
                        ).find((item) => item.dataset.condition === option.id);
                        row
                          ?.querySelector<HTMLButtonElement>("button")
                          ?.focus();
                      });
                    }}
                    variant="ghost"
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            ) : (
              <Button
                className="h-11 w-full justify-start px-3 text-muted-foreground"
                onClick={() => {
                  setAdding(true);
                  requestAnimationFrame(() =>
                    content.current
                      ?.querySelector<HTMLButtonElement>("[data-add-property]")
                      ?.focus()
                  );
                }}
                variant="ghost"
              >
                <PlusIcon aria-hidden />
                Adicionar filtro
              </Button>
            )}
          </div>
        )}
        {conditions.length > 0 && (
          <p className="border-t px-4 py-2.5 text-muted-foreground text-xs">
            Alterações aplicadas automaticamente.
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}
