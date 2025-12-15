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
        if (onlySymbol) {
            return code;
        }
        if (amount === 0) {
            return code; // Retourner juste le code pour 0
        }
        return new Intl.NumberFormat(locale, {
            style: "currency",
            currency: code,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);
    }

    // Si tu veux juste le symbole OU si le montant est 0
    if (onlySymbol || amount === 0) {
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