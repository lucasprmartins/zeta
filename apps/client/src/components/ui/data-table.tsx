import {
  type ColumnDef,
  type RowData,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import type { ReactNode } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./table";

const features = tableFeatures({});
export type DataTableColumn<TData extends RowData> = ColumnDef<
  typeof features,
  TData
>;

export interface DataTableProps<TData extends RowData> {
  activeRowId?: string | undefined;
  columnClassNames?: Readonly<Record<string, string>>;
  columns: DataTableColumn<TData>[];
  data: TData[];
  empty?: ReactNode;
  getRowId: (item: TData) => string;
  label: string;
}

// A feature controla consultas e paginação; esta superfície não transforma
// parcialmente os dados recebidos com filtros ou ordenação locais.
export function DataTable<TData extends RowData>({
  columns,
  data,
  getRowId,
  label,
  columnClassNames,
  activeRowId,
  empty = "Nenhum resultado encontrado.",
}: DataTableProps<TData>) {
  const table = useTable({ features, columns, data, getRowId });
  return (
    <div className="min-w-0 overflow-hidden rounded-lg border">
      <Table aria-label={label} className="table-fixed">
        <TableHeader>
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id}>
              {group.headers.map((header) => (
                <TableHead
                  className={columnClassNames?.[header.column.id]}
                  colSpan={header.colSpan}
                  key={header.id}
                  scope="col"
                >
                  {header.isPlaceholder ? null : (
                    <table.FlexRender header={header} />
                  )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow data-active={row.id === activeRowId} key={row.id}>
                {row.getAllCells().map((cell) => (
                  <TableCell
                    className={columnClassNames?.[cell.column.id]}
                    key={cell.id}
                  >
                    <table.FlexRender cell={cell} />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length}>{empty}</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
