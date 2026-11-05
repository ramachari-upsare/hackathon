from app.services.csv_ingestion import parse_transactions_csv

FROM = "641d75bf-a45f-560f-8716-63ea62b69511"
TO = "f09954e8-f97f-5753-98b9-13ef3665d5ce"


def test_comma_csv_accepts_optional_currency_and_channel():
    csv_data = (
        "from_account,to_account,amount,timestamp\n"
        f"{FROM},{TO},125.50,2026-11-03T09:00:00Z\n"
    ).encode()
    result = parse_transactions_csv(csv_data, filename="sample.csv", max_rows=10)
    assert result.row_count == 1
    assert result.transactions[0].currency == "USD"
    assert str(result.transactions[0].channel) == "api"


def test_semicolon_delimited_csv_is_detected():
    csv_data = (
        "from_account;to_account;amount;currency;timestamp;channel\n"
        f"{FROM};{TO};125.50;USD;2026-11-03T09:00:00Z;mobile\n"
    ).encode()
    result = parse_transactions_csv(csv_data, filename="excel.csv", max_rows=10)
    assert result.row_count == 1
    assert result.transactions[0].amount == 125.50


def test_headers_are_case_and_whitespace_insensitive():
    csv_data = (
        " From Account , To Account , Amount , Timestamp \n"
        f"{FROM},{TO},99.00,2026-11-03T09:00:00Z\n"
    ).encode()
    result = parse_transactions_csv(csv_data, filename="headers.csv", max_rows=10)
    assert result.row_count == 1
