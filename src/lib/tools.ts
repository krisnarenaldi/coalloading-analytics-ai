// tools.ts
export const RETAIL_TOOLS = [
  {
    name: "get_schema",
    description:
      "Ambil struktur tabel database untuk memahami kolom yang tersedia",
    input_schema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "fob_summary",
    description: "Get FOB Summary in interval date",
    input_schema: {
      type: "object",
      properties: {
        start_date: {
          type: "string",
          description: "Start date (ISO 8601, e.g. 2024-01-01)",
        },
        end_date: {
          type: "string",
          description: "End date (ISO 8601, e.g. 2024-12-31)",
        },
      },
      required: [],
    },
  },

  {
    name: "trans_summary",
    description: "Get TRANS summary in interval date",
    input_schema: {
      type: "object",
      properties: {
        start_date: { type: "string", description: "Start date (ISO 8601)" },
        end_date: { type: "string", description: "End date (ISO 8601)" },
      },
      required: [],
    },
  },

  {
    name: "cif_summary",
    description: "Get CIF summary in interval date",
    input_schema: {
      type: "object",
      properties: {
        start_date: { type: "string", description: "Start date (ISO 8601)" },
        end_date: { type: "string", description: "End date (ISO 8601)" },
      },
      required: [],
    },
  },
];
