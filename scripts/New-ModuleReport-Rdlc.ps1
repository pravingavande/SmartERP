# Generates TabularReport.rdlc and VoucherLedgerReport.rdlc for module reports.
$reportsDir = Join-Path $PSScriptRoot '..\backend\SmartEPR.Api\Reports'
New-Item -ItemType Directory -Force -Path $reportsDir | Out-Null

function New-TabularRdlc {
    param(
        [string]$Name,
        [string]$DataSetName,
        [bool]$GroupByLedger = $false
    )

    $groupXml = ''
    $groupHeaderXml = ''
    $rowHierarchy = @'
                <TablixMember>
                  <KeepWithGroup>After</KeepWithGroup>
                </TablixMember>
                <TablixMember>
                  <Group Name="Details" />
                </TablixMember>
'@

    if ($GroupByLedger) {
        $groupXml = @'
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
'@
        $groupHeaderXml = @'
                <TablixRow>
                  <Height>0.6cm</Height>
                  <TablixCells>
                    <TablixCell>
                      <CellContents>
                        <Textbox Name="TxtGroupTitle">
                          <CanGrow>true</CanGrow>
                          <Paragraphs>
                            <Paragraph>
                              <TextRuns>
                                <TextRun>
                                  <Value>=Fields!GroupTitle.Value</Value>
                                  <Style>
                                    <FontFamily>Calibri</FontFamily>
                                    <FontSize>9.5pt</FontSize>
                                    <FontWeight>Bold</FontWeight>
                                  </Style>
                                </TextRun>
                              </TextRuns>
                            </Paragraph>
                          </Paragraphs>
                          <Style><Border><Style>None</Style></Border></Style>
                        </Textbox>
                        <ColSpan>8</ColSpan>
                      </CellContents>
                    </TablixCell>
                    <TablixCell /><TablixCell /><TablixCell /><TablixCell /><TablixCell /><TablixCell /><TablixCell />
                  </TablixCells>
                </TablixRow>
'@
        $rowHierarchy = $groupXml
    }

    $colWidth = '2.4cm'
    $columns = (1..8 | ForEach-Object { "<TablixColumn><Width>$colWidth</Width></TablixColumn>" }) -join ''

    function ColHeaderCell([int]$idx, [string]$field) {
        return @"
                <TablixCell>
                  <CellContents>
                    <Textbox Name="Hdr$idx">
                      <Paragraphs><Paragraph><TextRuns><TextRun><Value>=First(Fields!$field.Value, "$DataSetName")</Value><Style><FontFamily>Calibri</FontFamily><FontSize>8.5pt</FontSize><FontWeight>Bold</FontWeight></Style></TextRun></TextRuns></Paragraph></Paragraphs>
                      <Style><Border><Style>Solid</Style></Border><BackgroundColor>Gainsboro</BackgroundColor></Style>
                    </Textbox>
                  </CellContents>
                </TablixCell>
"@
    }

    function DetailCell([int]$idx, [string]$field) {
        return @"
                <TablixCell>
                  <CellContents>
                    <Textbox Name="Det$idx">
                      <CanGrow>true</CanGrow>
                      <Paragraphs><Paragraph><TextRuns><TextRun><Value>=Fields!$field.Value</Value><Style><FontFamily>Calibri</FontFamily><FontSize>8pt</FontSize><FontWeight>=IIf(Fields!IsBold.Value=""Y"",""Bold"",""Normal"")</FontWeight></Style></TextRun></TextRuns></Paragraph></Paragraphs>
                      <Style><Border><Style>None</Style></Border><TopBorder><Color>DimGray</Color><Style>=IIf(Fields!ShowTopBorder.Value=""Y"",""Solid"",""None"")</Style><Width>0.5pt</Width></TopBorder></Style>
                    </Textbox>
                  </CellContents>
                </TablixCell>
"@
    }

    $headerCells = (1..8 | ForEach-Object { ColHeaderCell $_ "ColHeader$_" }) -join ''
    $detailCells = (1..8 | ForEach-Object { DetailCell $_ "Col$_" }) -join ''

    $xml = @"
<?xml version="1.0" encoding="utf-8"?>
<Report xmlns="http://schemas.microsoft.com/sqlserver/reporting/2016/01/reportdefinition" xmlns:rd="http://schemas.microsoft.com/SQLServer/reporting/reportdesigner">
  <AutoRefresh>0</AutoRefresh>
  <DataSources>
    <DataSource Name="TabularSource">
      <ConnectionProperties><DataProvider>System.Data.DataSet</DataProvider><ConnectString /></ConnectionProperties>
    </DataSource>
  </DataSources>
  <DataSets>
    <DataSet Name="$DataSetName">
      <Query><DataSourceName>TabularSource</DataSourceName><CommandText /></Query>
      <Fields>
        <Field Name="OrganizationHeader"><DataField>OrganizationHeader</DataField></Field>
        <Field Name="Address"><DataField>Address</DataField></Field>
        <Field Name="ReportTitle"><DataField>ReportTitle</DataField></Field>
        <Field Name="FilterText"><DataField>FilterText</DataField></Field>
        <Field Name="PrintedOn"><DataField>PrintedOn</DataField></Field>
        <Field Name="GroupKey"><DataField>GroupKey</DataField></Field>
        <Field Name="GroupTitle"><DataField>GroupTitle</DataField></Field>
        <Field Name="ColHeader1"><DataField>ColHeader1</DataField></Field>
        <Field Name="ColHeader2"><DataField>ColHeader2</DataField></Field>
        <Field Name="ColHeader3"><DataField>ColHeader3</DataField></Field>
        <Field Name="ColHeader4"><DataField>ColHeader4</DataField></Field>
        <Field Name="ColHeader5"><DataField>ColHeader5</DataField></Field>
        <Field Name="ColHeader6"><DataField>ColHeader6</DataField></Field>
        <Field Name="ColHeader7"><DataField>ColHeader7</DataField></Field>
        <Field Name="ColHeader8"><DataField>ColHeader8</DataField></Field>
        <Field Name="Col1"><DataField>Col1</DataField></Field>
        <Field Name="Col2"><DataField>Col2</DataField></Field>
        <Field Name="Col3"><DataField>Col3</DataField></Field>
        <Field Name="Col4"><DataField>Col4</DataField></Field>
        <Field Name="Col5"><DataField>Col5</DataField></Field>
        <Field Name="Col6"><DataField>Col6</DataField></Field>
        <Field Name="Col7"><DataField>Col7</DataField></Field>
        <Field Name="Col8"><DataField>Col8</DataField></Field>
        <Field Name="IsBold"><DataField>IsBold</DataField></Field>
        <Field Name="ShowTopBorder"><DataField>ShowTopBorder</DataField></Field>
      </Fields>
    </DataSet>
  </DataSets>
  <ReportSections>
    <ReportSection>
      <Body>
        <ReportItems>
          <Tablix Name="MainTablix">
            <TablixBody>
              <TablixColumns>$columns</TablixColumns>
              <TablixRows>
                <TablixRow><Height>0.55cm</Height><TablixCells>$headerCells</TablixCells></TablixRow>
                $groupHeaderXml
                <TablixRow><Height>0.45cm</Height><TablixCells>$detailCells</TablixCells></TablixRow>
              </TablixRows>
            </TablixBody>
            <TablixColumnHierarchy><TablixMembers>$(1..8 | ForEach-Object { '<TablixMember />' })</TablixMembers></TablixColumnHierarchy>
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

    $path = Join-Path $reportsDir $Name
    Set-Content -Path $path -Value $xml -Encoding UTF8
    Write-Host "Generated $Name"
}

New-TabularRdlc -Name 'TabularReport.rdlc' -DataSetName 'TabularReport' -GroupByLedger:$false
New-TabularRdlc -Name 'VoucherLedgerReport.rdlc' -DataSetName 'TabularReport' -GroupByLedger:$true
