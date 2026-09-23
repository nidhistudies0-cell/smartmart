import express from "express";
import cors from "cors";
import { db } from "./db";
import { sql } from "drizzle-orm";

const app = express();
const PORT = 5000;
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.json({
        message: "SmartMart Backend is running!"
    });
});

app.get("/api/products", async (req, res) => {
    try {
        const result = await db.execute(sql`
            SELECT
                p.product_id,
                p.product_name,
                p.price,
                c.category_name,
                s.supplier_name
            FROM product p
            INNER JOIN category c
                ON p.category_id = c.category_id
            INNER JOIN supplier s
                ON p.supplier_id = s.supplier_id
        `);

        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).json({
            error: "Failed to fetch products"
        });
    }
});

app.listen(PORT, () => {
    console.log(`SmartMart backend running on http://localhost:${PORT}`);
});