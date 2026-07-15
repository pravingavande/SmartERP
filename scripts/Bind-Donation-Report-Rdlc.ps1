# Bind data fields into donation RDLC templates without changing layout.
$reportsDir = Join-Path $PSScriptRoot '..\backend\SmartEPR.Api\Reports'
$files = @(
    'DonationDetailReport.rdlc',
    'DonationSchoolWiseDetailReport.rdlc',
    'DonationDetailSummaryReport.rdlc'
)

$extraFields = @'
        <Field Name="UserName">
          <DataField>UserName</DataField>
        </Field>
        <Field Name="TotalReceipts">
          <DataField>TotalReceipts</DataField>
        </Field>
        <Field Name="AmountValue">
          <DataField>AmountValue</DataField>
        </Field>
        <Field Name="FromDate">
          <DataField>FromDate</DataField>
        </Field>
        <Field Name="ToDate">
          <DataField>ToDate</DataField>
        </Field>
'@

foreach ($name in $files) {
    $path = Join-Path $reportsDir $name
    $xml = Get-Content -Raw -Path $path
    if ($xml -notmatch '<Field Name="AmountValue">') {
        $xml = $xml.Replace(
            "        <Field Name=`"PrintedOn`">`r`n          <DataField>PrintedOn</DataField>`r`n        </Field>",
            "        <Field Name=`"PrintedOn`">`r`n          <DataField>PrintedOn</DataField>`r`n        </Field>`r`n$extraFields"
        )
    }

    $xml = $xml.Replace('<Value>Total Receipts :</Value>', '<Value>="Total Receipts : " &amp; Count(Fields!ReceiptNo.Value, "DonationReceipt")</Value>')
    $xml = $xml.Replace('<Value>Total Amount  :</Value>', '<Value>="Total Amount  : " &amp; Format(Sum(Fields!AmountValue.Value, "DonationReceipt"), "#,##0.00")</Value>')
    $xml = $xml.Replace('<Value>Print Date :</Value>', '<Value>="Print Date : " &amp; First(Fields!PrintedOn.Value, "DonationReceipt")</Value>')
    $xml = $xml.Replace('<FontFamily>Times New Roman</FontFamily>', '<FontFamily>Nirmala UI</FontFamily>')
    $xml = $xml.Replace('<Value>From Date :</Value>', '<Value>="From Date : " &amp; First(Fields!FromDate.Value, "DonationReceipt")</Value>')
    $xml = $xml.Replace('<Value>To Date :</Value>', '<Value>="To Date : " &amp; First(Fields!ToDate.Value, "DonationReceipt")</Value>')

    Set-Content -Path $path -Value $xml -NoNewline -Encoding UTF8
    Write-Host "Updated fields/header/footer: $name"
}

# Donation Detail Report detail row
$detailPath = Join-Path $reportsDir 'DonationDetailReport.rdlc'
$detail = Get-Content -Raw -Path $detailPath
$detailMap = @{
    'Textbox4'  = '=RowNumber("Details")'
    'Textbox6'  = '=Fields!OrgReceiptNo.Value'
    'Textbox8'  = '=Fields!ReceiptDate.Value'
    'Textbox19' = '=Fields!DonorName.Value'
    'Textbox17' = '=Fields!MobileNo.Value'
    'Textbox15' = '=Fields!PanNo.Value'
    'Textbox12' = '=Fields!AadharNo.Value'
    'Textbox10' = '=Fields!AmountNumber.Value'
    'Textbox21' = '=Fields!PaymentType.Value'
}
foreach ($entry in $detailMap.GetEnumerator()) {
    $pattern = "(?s)(<Textbox Name=`"$($entry.Key)`">.*?<Value\s*/>)"
    $replacement = "`${1}".Replace('<Value />', "<Value>$($entry.Value)</Value>")
    $detail = [regex]::Replace($detail, $pattern, { param($m) $m.Value -replace '<Value\s*/>', "<Value>$($entry.Value)</Value>" }, 1)
}
Set-Content -Path $detailPath -Value $detail -NoNewline -Encoding UTF8
Write-Host 'Updated DonationDetailReport detail bindings'

# School-wise detail row
$schoolPath = Join-Path $reportsDir 'DonationSchoolWiseDetailReport.rdlc'
$school = Get-Content -Raw -Path $schoolPath
$schoolMap = @{
    'Textbox4'  = '=RowNumber("Details")'
    'Textbox6'  = '=Fields!OrgReceiptNo.Value'
    'Textbox8'  = '=Fields!ReceiptDate.Value'
    'Textbox19' = '=Fields!DonorName.Value'
    'Textbox10' = '=Fields!AmountNumber.Value'
    'Textbox21' = '=Fields!PaymentType.Value'
    'Textbox2'  = '=Fields!OrganizationName.Value'
    'Textbox12' = '=Fields!UserName.Value'
}
foreach ($entry in $schoolMap.GetEnumerator()) {
    $school = [regex]::Replace($school, "(?s)(<Textbox Name=`"$($entry.Key)`">.*?<Value\s*/>)", { param($m) $m.Value -replace '<Value\s*/>', "<Value>$($entry.Value)</Value>" }, 1)
}
Set-Content -Path $schoolPath -Value $school -NoNewline -Encoding UTF8
Write-Host 'Updated DonationSchoolWiseDetailReport detail bindings'

# User-wise summary detail row
$summaryPath = Join-Path $reportsDir 'DonationDetailSummaryReport.rdlc'
$summary = Get-Content -Raw -Path $summaryPath
$summaryMap = @{
    'Textbox6'  = '=Fields!ReceiptNo.Value'
    'Textbox8'  = '=Fields!OrganizationName.Value'
    'Textbox10' = '=Fields!UserName.Value'
    'Textbox21' = '=Fields!PaymentType.Value'
    'Textbox2'  = '=Fields!AmountNumber.Value'
    'Textbox12' = '=Fields!TotalReceipts.Value'
    'Textbox15' = '=Fields!Remark.Value'
}
foreach ($entry in $summaryMap.GetEnumerator()) {
    $summary = [regex]::Replace($summary, "(?s)(<Textbox Name=`"$($entry.Key)`">.*?<Value\s*/>)", { param($m) $m.Value -replace '<Value\s*/>', "<Value>$($entry.Value)</Value>" }, 1)
}
Set-Content -Path $summaryPath -Value $summary -NoNewline -Encoding UTF8
Write-Host 'Updated DonationDetailSummaryReport detail bindings'
