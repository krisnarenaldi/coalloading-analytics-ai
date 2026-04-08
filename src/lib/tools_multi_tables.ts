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
    name: "get_end_to_end_shipments",
    description: "Get shipment lifecycle data (FOB → TRANS → CIF)",
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
        kapal: {
          type: "string",
          description: "Vessel name filter, or null for all",
        },
        pemasok: {
          type: "string",
          description: "Supplier name filter, or null for all",
        },
      },
      required: [],
    },
  },

  {
    name: "get_vessel_performance",
    description: "Analyze vessel performance and lead time",
    input_schema: {
      type: "object",
      properties: {
        start_date: { type: "string", description: "Start date (ISO 8601)" },
        end_date: { type: "string", description: "End date (ISO 8601)" },
        kapal: {
          type: "string",
          description: "Vessel name filter, or null for all",
        },
      },
      required: [],
    },
  },

  {
    name: "get_volume_loss",
    description: "Analyze shipment volume loss and shrinkage",
    input_schema: {
      type: "object",
      properties: {
        start_date: { type: "string", description: "Start date (ISO 8601)" },
        end_date: { type: "string", description: "End date (ISO 8601)" },
        threshold: {
          type: "number",
          description:
            "Volume loss threshold percentage, or null for no filter",
        },
      },
      required: [],
    },
  },

  {
    name: "get_bottleneck_analysis",
    description: "Analyze supply chain delays",
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
    name: "get_pricing_integrity",
    description: "Analyze pricing vs quality",
    input_schema: {
      type: "object",
      properties: {
        start_date: { type: "string", description: "Start date (ISO 8601)" },
        end_date: { type: "string", description: "End date (ISO 8601)" },
        min_gcv: {
          type: "number",
          description: "Minimum GCV value filter, or null for no filter",
        },
      },
      required: [],
    },
  },
];
