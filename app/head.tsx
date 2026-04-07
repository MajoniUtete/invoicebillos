import { useState, useEffect } from "react";

type InvoiceForm = {
  customer: string;
  amount: number;
  currency: string;
  date: string;
  dueDate: string;
  notes: string;
  items: { description: string; quantity: number; price: number }[];
};

const CURRENCY_OPTIONS = [
  { code: "USD", label: "US Dollar" },
  { code: "EUR", label: "Euro" },
  { code: "GBP", label: "British Pound" },
  { code: "ZAR", label: "South African Rand" },
  { code: "NGN", label: "Nigerian Naira" },
  { code: "KES", label: "Kenyan Shilling" },
  { code: "GHS", label: "Ghanaian Cedi" },
  { code: "EGP", label: "Egyptian Pound" },
  { code: "AED", label: "UAE Dirham" },
  { code: "SAR", label: "Saudi Riyal" },
  { code: "INR", label: "Indian Rupee" },
  { code: "CNY", label: "Chinese Yuan" },
  { code: "JPY", label: "Japanese Yen" },
  { code: "CAD", label: "Canadian Dollar" },
  { code: "AUD", label: "Australian Dollar" },
  { code: "CHF", label: "Swiss Franc" },
  { code: "SEK", label: "Swedish Krona" },
  { code: "NOK", label: "Norwegian Krone" },
  { code: "DKK", label: "Danish Krone" },
  { code: "NZD", label: "New Zealand Dollar" },
  { code: "SGD", label: "Singapore Dollar" },
  { code: "HKD", label: "Hong Kong Dollar" },
  { code: "BRL", label: "Brazilian Real" },
  { code: "MXN", label: "Mexican Peso" },
  { code: "TRY", label: "Turkish Lira" },
  { code: "ZiG", label: "Zimbabwe Gold" },
];

function createEmptyForm(): InvoiceForm {
  return {
    customer: "",
    amount: 0,
    currency: "EUR",
    date: new Date().toISOString().split("T")[0],
    dueDate: new Date().toISOString().split("T")[0],
    notes: "",
    items: [],
  };
}

export default function Head() {
  return (
    <>
      <link rel="icon" href="/favicon.ico?v=3" sizes="any" />
      <link rel="shortcut icon" href="/favicon.ico?v=3" />
      <link rel="apple-touch-icon" href="/favicon.ico?v=3" />
    </>
  );
}