# Generates dedicated RDLC files for each module report (named columns, no shared TabularReport).
$reportsDir = Join-Path $PSScriptRoot '..\backend\SmartEPR.Api\Reports'
New-Item -ItemType Directory -Force -Path $reportsDir | Out-Null

function New-DedicatedRdlc {
    param(
        [string]$FileName,
        [string]$DataSetName,
        [string[]]$HeaderFields,
        [object[]]$Columns,
        [string]$GroupField = $null
    )

    $headerFieldXml = ($HeaderFields | ForEach-Object {
        "        <Field Name=`"$_`"><DataField>$_</DataField></Field>"
    }) -join "`n"

    $detailFieldXml = ($Columns | ForEach-Object {
        "        <Field Name=`"$($_.Field)`"><DataField>$($_.Field)</DataField></Field>"
    }) -join "`n"

    if ($GroupField) {
        $headerFieldXml += "`n        <Field Name=`"GroupKey`"><DataField>GroupKey</DataField></Field>"
        $headerFieldXml += "`n        <Field Name=`"GroupTitle`"><DataField>GroupTitle</DataField></Field>"
    }

    $colXml = ($Columns | ForEach-Object { "<TablixColumn><Width>$($_.Width)</Width></TablixColumn>" }) -join ''
    $colCount = $Columns.Count

    function HeaderCell([string]$label) {
        return @"
                <TablixCell>
                  <CellContents>
                    <Textbox Name="Hdr_$($label -replace '[^a-zA-Z0-9]','')">
                      <Paragraphs><Paragraph><TextRuns><TextRun><Value>$label</Value><Style><FontFamily>Calibri</FontFamily><FontSize>8.5pt</FontSize><FontWeight>Bold</FontWeight></Style></TextRun></TextRuns></Paragraph></Paragraphs>
                      <Style><Border><Style>Solid</Style></Border><BackgroundColor>Gainsboro</BackgroundColor></Style>
                    </Textbox>
                  </CellContents>
                </TablixCell>
"@
    }

    function DetailCell([string]$field) {
        return @"
                <TablixCell>
                  <CellContents>
                    <Textbox Name="Det_$field">
                      <CanGrow>true</CanGrow>
                      <Paragraphs><Paragraph><TextRuns><TextRun><Value>=Fields!$field.Value</Value><Style><FontFamily>Calibri</FontFamily><FontSize>8pt</FontSize></Style></TextRun></TextRuns></Paragraph></Paragraphs>
                      <Style><Border><Style>None</Style></Border></Style>
                    </Textbox>
                  </CellContents>
                </TablixCell>
"@
    }

    $headerCells = ($Columns | ForEach-Object { HeaderCell $_.Label }) -join ''
    $detailCells = ($Columns | ForEach-Object { DetailCell $_.Field }) -join ''

    $groupHeaderXml = ''
    $rowHierarchy = @'
                <TablixMember />
                <TablixMember>
                  <Group Name="Details" />
                </TablixMember>
'@

    if ($GroupField) {
        $groupHeaderXml = @'
                <TablixRow>
                  <Height>0.6cm</Height>
                  <TablixCells>
                    <TablixCell>
                      <CellContents>
                        <Textbox Name="TxtGroupTitle">
                          <CanGrow>true</CanGrow>
                          <Paragraphs><Paragraph><TextRuns><TextRun><Value>=Fields!GroupTitle.Value</Value><Style><FontFamily>Calibri</FontFamily><FontSize>9.5pt</FontSize><FontWeight>Bold</FontWeight></Style></TextRun></TextRuns></Paragraph></Paragraphs>
                          <Style><Border><Style>None</Style></Border></Style>
                        </Textbox>
                        <ColSpan>COLCOUNT</ColSpan>
                      </CellContents>
                    </TablixCell>
COLSPAN_CELLS
                  </TablixCells>
                </TablixRow>
'@
        $spanCells = (2..($colCount) | ForEach-Object { '                    <TablixCell />' }) -join "`n"
        $groupHeaderXml = $groupHeaderXml.Replace('COLCOUNT', $colCount).Replace('COLSPAN_CELLS', $spanCells)

        $rowHierarchy = @"
                <TablixMember />
                <TablixMember>
                  <Group Name="LedgerGroup">
                    <GroupExpressions>
                      <GroupExpression>=Fields!GroupKey.Value</GroupExpression>
                    </GroupExpressions>
                    <PageBreak>
                      <BreakLocation>End</BreakLocation>
                    </PageBreak>
                  </Group>
                  <TablixMembers>
                    <TablixMember>
                      <KeepWithGroup>After</KeepWithGroup>
                    </TablixMember>
                    <TablixMember>
                      <Group Name="Details" />
                    </TablixMember>
                  </TablixMembers>
                </TablixMember>
"@
    }

    $colMembers = (1..$colCount | ForEach-Object { '<TablixMember />' }) -join ''

    $xml = @"
<?xml version="1.0" encoding="utf-8"?>
<Report xmlns="http://schemas.microsoft.com/sqlserver/reporting/2016/01/reportdefinition" xmlns:rd="http://schemas.microsoft.com/SQLServer/reporting/reportdesigner">
  <AutoRefresh>0</AutoRefresh>
  <DataSources>
    <DataSource Name="ReportSource">
      <ConnectionProperties><DataProvider>System.Data.DataSet</DataProvider><ConnectString /></ConnectionProperties>
    </DataSource>
  </DataSources>
  <DataSets>
    <DataSet Name="$DataSetName">
      <Query><DataSourceName>ReportSource</DataSourceName><CommandText /></Query>
      <Fields>
$headerFieldXml
$detailFieldXml
      </Fields>
    </DataSet>
  </DataSets>
  <ReportSections>
    <ReportSection>
      <Body>
        <ReportItems>
          <Tablix Name="MainTablix">
            <TablixBody>
              <TablixColumns>$colXml</TablixColumns>
              <TablixRows>
                <TablixRow><Height>0.55cm</Height><TablixCells>$headerCells</TablixCells></TablixRow>
                $groupHeaderXml
                <TablixRow><Height>0.45cm</Height><TablixCells>$detailCells</TablixCells></TablixRow>
              </TablixRows>
            </TablixBody>
            <TablixColumnHierarchy><TablixMembers>$colMembers</TablixMembers></TablixColumnHierarchy>
            <TablixRowHierarchy><TablixMembers>$rowHierarchy</TablixMembers></TablixRowHierarchy>
            <DataSetName>$DataSetName</DataSetName>
            <Top>0cm</Top><Left>0cm</Left><Height>1.2cm</Height><Width>19.2cm</Width>
          </Tablix>
        </ReportItems>
        <Height>1.5cm</Height>
      </Body>
      <Width>19.2cm</Width>
      <Page>
        <PageHeader>
          <Height>2.4cm</Height>
          <ReportItems>
            <Textbox Name="TxtOrg"><Paragraphs><Paragraph><TextRuns><TextRun><Value>=First(Fields!OrganizationHeader.Value, "$DataSetName")</Value><Style><FontFamily>Calibri</FontFamily><FontSize>11pt</FontSize><FontWeight>Bold</FontWeight></Style></TextRun></TextRuns><Style><TextAlign>Center</TextAlign></Style></Paragraph></Paragraphs><Top>0cm</Top><Left>0cm</Left><Height>0.5cm</Height><Width>19.2cm</Width></Textbox>
            <Textbox Name="TxtAddr"><Paragraphs><Paragraph><TextRuns><TextRun><Value>=First(Fields!Address.Value, "$DataSetName")</Value><Style><FontFamily>Calibri</FontFamily><FontSize>9pt</FontSize></Style></TextRun></TextRuns><Style><TextAlign>Center</TextAlign></Style></Paragraph></Paragraphs><Top>0.5cm</Top><Left>0cm</Left><Height>0.4cm</Height><Width>19.2cm</Width></Textbox>
            <Textbox Name="TxtTitle"><Paragraphs><Paragraph><TextRuns><TextRun><Value>=First(Fields!ReportTitle.Value, "$DataSetName")</Value><Style><FontFamily>Calibri</FontFamily><FontSize>12pt</FontSize><FontWeight>Bold</FontWeight></Style></TextRun></TextRuns><Style><TextAlign>Center</TextAlign></Style></Paragraph></Paragraphs><Top>0.95cm</Top><Left>0cm</Left><Height>0.45cm</Height><Width>19.2cm</Width></Textbox>
            <Textbox Name="TxtFilter"><Paragraphs><Paragraph><TextRuns><TextRun><Value>=First(Fields!FilterText.Value, "$DataSetName")</Value><Style><FontFamily>Calibri</FontFamily><FontSize>8.5pt</FontSize></Style></TextRun></TextRuns><Style><TextAlign>Center</TextAlign></Style></Paragraph></Paragraphs><Top>1.45cm</Top><Left>0cm</Left><Height>0.35cm</Height><Width>19.2cm</Width></Textbox>
          </ReportItems>
        </PageHeader>
        <PageFooter>
          <Height>0.5cm</Height>
          <ReportItems>
            <Textbox Name="TxtPrint"><Paragraphs><Paragraph><TextRuns><TextRun><Value>="Print Date: " &amp; First(Fields!PrintedOn.Value, "$DataSetName")</Value><Style><FontFamily>Calibri</FontFamily><FontSize>8pt</FontSize></Style></TextRun></TextRuns></Paragraph></Paragraphs><Top>0cm</Top><Left>0cm</Left><Height>0.4cm</Height><Width>19.2cm</Width></Textbox>
          </ReportItems>
        </PageFooter>
      </Page>
    </ReportSection>
  </ReportSections>
</Report>
"@

    $path = Join-Path $reportsDir $FileName
    Set-Content -Path $path -Value $xml -Encoding UTF8
    Write-Host "Generated $FileName"
}

$commonHeader = @('OrganizationHeader', 'Address', 'ReportTitle', 'FilterText', 'PrintedOn')

New-DedicatedRdlc -FileName 'VoucherLedgerReport.rdlc' -DataSetName 'VoucherLedger' -HeaderFields $commonHeader -Columns @(
    @{ Label = 'Date'; Field = 'VDate'; Width = '2cm' },
    @{ Label = 'Voucher No'; Field = 'VCode'; Width = '2cm' },
    @{ Label = 'Type'; Field = 'VType'; Width = '2.2cm' },
    @{ Label = 'Narration'; Field = 'Narration'; Width = '5.5cm' },
    @{ Label = 'Debit'; Field = 'Debit'; Width = '3.75cm' },
    @{ Label = 'Credit'; Field = 'Credit'; Width = '3.75cm' }
)

New-DedicatedRdlc -FileName 'VoucherLedgerAllHeadsReport.rdlc' -DataSetName 'VoucherLedgerAllHeads' -HeaderFields $commonHeader -GroupField 'GroupKey' -Columns @(
    @{ Label = 'Date'; Field = 'VDate'; Width = '2cm' },
    @{ Label = 'Voucher No'; Field = 'VCode'; Width = '2cm' },
    @{ Label = 'Type'; Field = 'VType'; Width = '2.2cm' },
    @{ Label = 'Narration'; Field = 'Narration'; Width = '5.5cm' },
    @{ Label = 'Debit'; Field = 'Debit'; Width = '3.75cm' },
    @{ Label = 'Credit'; Field = 'Credit'; Width = '3.75cm' }
)

New-DedicatedRdlc -FileName 'TrialBalanceReport.rdlc' -DataSetName 'TrialBalance' -HeaderFields $commonHeader -Columns @(
    @{ Label = 'Ledger Head'; Field = 'LedgerHead'; Width = '5cm' },
    @{ Label = 'Opening Balance'; Field = 'OpeningBalance'; Width = '3.55cm' },
    @{ Label = 'Debit'; Field = 'Debit'; Width = '3.55cm' },
    @{ Label = 'Credit'; Field = 'Credit'; Width = '3.55cm' },
    @{ Label = 'Closing Balance'; Field = 'ClosingBalance'; Width = '3.55cm' }
)

New-DedicatedRdlc -FileName 'SchoolCollegeReport.rdlc' -DataSetName 'SchoolCollege' -HeaderFields $commonHeader -Columns @(
    @{ Label = 'Sr No'; Field = 'SrNo'; Width = '1.2cm' },
    @{ Label = 'School / College'; Field = 'SchoolName'; Width = '4.5cm' },
    @{ Label = 'Category'; Field = 'Category'; Width = '2.5cm' },
    @{ Label = 'City'; Field = 'City'; Width = '2cm' },
    @{ Label = 'UDISE No'; Field = 'UDiseNo'; Width = '2.5cm' },
    @{ Label = 'Mobile'; Field = 'Mobile'; Width = '2.5cm' },
    @{ Label = 'Email'; Field = 'Email'; Width = '2.5cm' },
    @{ Label = 'Status'; Field = 'Status'; Width = '1.5cm' }
)

$employeeCols = @(
    @{ Label = 'Sr No'; Field = 'SrNo'; Width = '1.2cm' },
    @{ Label = 'Employee Name'; Field = 'EmployeeName'; Width = '3.5cm' },
    @{ Label = 'Designation'; Field = 'Designation'; Width = '2.5cm' },
    @{ Label = 'School'; Field = 'School'; Width = '3.5cm' },
    @{ Label = 'Mobile'; Field = 'Mobile'; Width = '2.5cm' },
    @{ Label = 'Joining Date'; Field = 'JoiningDate'; Width = '2cm' },
    @{ Label = 'Staff Type'; Field = 'StaffType'; Width = '2cm' },
    @{ Label = 'Role'; Field = 'Role'; Width = '2cm' }
)

New-DedicatedRdlc -FileName 'EmployeeReport.rdlc' -DataSetName 'Employee' -HeaderFields $commonHeader -Columns $employeeCols
New-DedicatedRdlc -FileName 'EmployeeSeniorityReport.rdlc' -DataSetName 'EmployeeSeniority' -HeaderFields $commonHeader -Columns $employeeCols
New-DedicatedRdlc -FileName 'RetiredEmployeeReport.rdlc' -DataSetName 'RetiredEmployee' -HeaderFields $commonHeader -Columns $employeeCols

New-DedicatedRdlc -FileName 'InwardRegisterReport.rdlc' -DataSetName 'InwardRegister' -HeaderFields $commonHeader -Columns @(
    @{ Label = 'Record No'; Field = 'RecordNo'; Width = '1.5cm' },
    @{ Label = 'Inward Date'; Field = 'InwardDate'; Width = '2cm' },
    @{ Label = 'File No'; Field = 'FileNo'; Width = '2cm' },
    @{ Label = 'Letter No'; Field = 'LetterNo'; Width = '2cm' },
    @{ Label = 'From Whom'; Field = 'FromWhom'; Width = '3cm' },
    @{ Label = 'Subject'; Field = 'Subject'; Width = '3cm' },
    @{ Label = 'School'; Field = 'School'; Width = '2.7cm' },
    @{ Label = 'Remark'; Field = 'Remark'; Width = '3cm' }
)

New-DedicatedRdlc -FileName 'OutwardRegisterReport.rdlc' -DataSetName 'OutwardRegister' -HeaderFields $commonHeader -Columns @(
    @{ Label = 'Record No'; Field = 'RecordNo'; Width = '1.5cm' },
    @{ Label = 'Outward Date'; Field = 'OutwardDate'; Width = '2cm' },
    @{ Label = 'File No'; Field = 'FileNo'; Width = '2cm' },
    @{ Label = 'Subject'; Field = 'Subject'; Width = '3.5cm' },
    @{ Label = 'Address'; Field = 'AddressLine'; Width = '3cm' },
    @{ Label = 'Enclosures'; Field = 'Enclosures'; Width = '2cm' },
    @{ Label = 'School'; Field = 'School'; Width = '2.7cm' },
    @{ Label = 'Remark'; Field = 'Remark'; Width = '2.5cm' }
)

New-DedicatedRdlc -FileName 'StockRegisterReport.rdlc' -DataSetName 'StockRegister' -HeaderFields $commonHeader -Columns @(
    @{ Label = 'Item Group'; Field = 'ItemGroup'; Width = '3.5cm' },
    @{ Label = 'Item Name'; Field = 'ItemName'; Width = '4.5cm' },
    @{ Label = 'Opening Qty'; Field = 'OpeningQty'; Width = '2.7cm' },
    @{ Label = 'Inward Qty'; Field = 'InwardQty'; Width = '2.7cm' },
    @{ Label = 'Outward Qty'; Field = 'OutwardQty'; Width = '2.7cm' },
    @{ Label = 'Closing Qty'; Field = 'ClosingQty'; Width = '3.1cm' }
)

Write-Host "Done. Generated dedicated module report RDLCs."
