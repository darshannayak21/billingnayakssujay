"""
Indian Currency to Words Converter
Accurately formats amounts according to the Indian numbering system:
Crores, Lakhs, Thousands, Hundreds, Units, and Paise.
"""

def number_to_words_indian(num: float) -> str:
    try:
        num = round(float(num), 2)
    except (ValueError, TypeError):
        return "Zero Rupees Only"

    if num == 0:
        return "Zero Rupees Only"

    is_negative = num < 0
    num = abs(num)

    rupees = int(num)
    paise = int(round((num - rupees) * 100))

    units = [
        "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
        "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
        "Seventeen", "Eighteen", "Nineteen"
    ]
    tens = [
        "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"
    ]

    def two_digits(n: int) -> str:
        if n == 0:
            return ""
        if n < 20:
            return units[n]
        rem = n % 10
        return tens[n // 10] + (" " + units[rem] if rem > 0 else "")

    def convert_below_thousand(n: int) -> str:
        res = ""
        h = n // 100
        rem = n % 100
        if h > 0:
            res += units[h] + " Hundred"
            if rem > 0:
                res += " " + two_digits(rem)
        else:
            res += two_digits(rem)
        return res

    def convert_rupees(n: int) -> str:
        if n == 0:
            return "Zero"

        crore = n // 10000000
        rem = n % 10000000
        lakh = rem // 100000
        rem = rem % 100000
        thousand = rem // 1000
        rem = rem % 1000

        parts = []
        if crore > 0:
            parts.append(two_digits(crore) + " Crore")
        if lakh > 0:
            parts.append(two_digits(lakh) + " Lakh")
        if thousand > 0:
            parts.append(two_digits(thousand) + " Thousand")
        if rem > 0:
            parts.append(convert_below_thousand(rem))

        return " ".join(parts).strip()

    rupees_part = convert_rupees(rupees)
    paise_part = two_digits(paise) if paise > 0 else ""

    result = ("Minus " if is_negative else "") + "Indian Rupees " + rupees_part
    if paise > 0:
        result += " and " + paise_part + " Paise"
    result += " Only"

    return result

if __name__ == "__main__":
    test_cases = [0, 4200, 15450.50, 125000, 10000000, 2450.75]
    for tc in test_cases:
        print(f"₹ {tc} -> {number_to_words_indian(tc)}")
