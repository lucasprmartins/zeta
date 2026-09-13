import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DataTable,
  type DataTableColumn,
} from "../src/components/ui/data-table";

interface Item {
  id: string;
  name: string;
}
const columns: DataTableColumn<Item>[] = [
  { accessorKey: "name", header: "Nome" },
];
const getRowId = (item: Item) => item.id;

describe("DataTable", () => {
  test("renderiza tabela semântica, preservando ordem e identidade dos dados", () => {
    const html = renderToStaticMarkup(
      <DataTable
        activeRowId="b"
        columns={columns}
        data={[
          { id: "b", name: "Beta" },
          { id: "a", name: "Alpha" },
        ]}
        getRowId={getRowId}
        label="Itens"
      />
    );
    expect(html).toContain('aria-label="Itens"');
    expect(html).toContain('scope="col"');
    expect(html).toContain('data-active="true"');
    expect(html.indexOf("Beta")).toBeLessThan(html.indexOf("Alpha"));
  });
  test("aceita células e vazio definidos pela funcionalidade", () => {
    const custom: DataTableColumn<Item>[] = [
      {
        id: "custom",
        header: "Nome",
        cell: ({ row }) => (
          <button type="button">Abrir {row.original.name}</button>
        ),
      },
    ];
    const html = renderToStaticMarkup(
      <DataTable
        columns={custom}
        data={[{ id: "a", name: "Alpha" }]}
        getRowId={getRowId}
        label="Itens"
      />
    );
    expect(html).toContain('type="button">Abrir Alpha');
    const empty = renderToStaticMarkup(
      <DataTable
        columns={custom}
        data={[]}
        empty="Sem itens neste filtro"
        getRowId={getRowId}
        label="Itens"
      />
    );
    expect(empty).toContain("Sem itens neste filtro");
  });
});
