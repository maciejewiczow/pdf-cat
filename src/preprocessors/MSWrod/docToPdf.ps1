[CmdletBinding()]
param (
    [Parameter()]
    [String]
    $prefix = "",
    [Parameter(ValueFromRemainingArguments=$true)]
    [String[]]
    $files
)

$wordInstance = New-Object -ComObject Word.Application

foreach ($fileName in $files) {
    $file = Get-Item $fileName

    if (!$file.PSIsContainer) {
        $document = $wordInstance.Documents.Open($file.FullName)

        $pdf_filename = "$($file.DirectoryName)\$($prefix)$($file.BaseName).pdf"

        $document.SaveAs([ref] $pdf_filename, [ref] 17)

        $document.Close()
    }
}

$wordInstance.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($wordInstance)
Remove-Variable wordInstance
