import currencies from "./currencies.json";

type CurrencyInfo = {
    country: string;
    currency: string;
    code: string;
    symbol: string;
    position: "left" | "right";
};

export function formatCurrency(
    amount: number,
    code: string,
    locale = "fr-FR",
    onlySymbol = false
): string {
    const currency = (currencies as CurrencyInfo[]).find(c => c.code === code);

    // Si la devise n'est pas dans ton JSON, fallback vers Intl
    if (!currency) {
        return onlySymbol
            ? code
            : new Intl.NumberFormat(locale, {
                style: "currency",
                currency: code,
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }).format(amount);
    }

    // Si tu veux juste le symbole
    if (onlySymbol) {
        return currency.symbol;
    }

    // Formatage du montant avec décimales
    const formattedAmount = amount.toLocaleString(locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    // Placement du symbole selon la convention
    return currency.position === "left"
        ? `${currency.symbol} ${formattedAmount}`
        : `${formattedAmount} ${currency.symbol}`;
}

