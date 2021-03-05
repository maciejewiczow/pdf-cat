[CmdletBinding()]
param (
    [Parameter()]
    [String]
    $prefix = "",
    [Parameter(ValueFromRemainingArguments=$true)]
    [String[]]
    $files
)

Function Write-Stderr {
    [CmdletBinding(DefaultParameterSetName='ErrorMessage')]
    param(
         [Parameter(Position=0,ParameterSetName='ErrorMessage',ValueFromPipeline,Mandatory)][string]$errorMessage,
         [Parameter(ParameterSetName='ErrorRecord',ValueFromPipeline)][System.Management.Automation.ErrorRecord]$errorRecord,
         [Parameter(ParameterSetName='Exception',ValueFromPipeline)][Exception]$exception
    )

    # return

    switch($PsCmdlet.ParameterSetName) {
    'ErrorMessage' {
         $err = $errorMessage
    }
    'ErrorRecord' {
         $errorMessage = @($error)[0]
         $err = $errorRecord
    }
    'Exception'   {
         $errorMessage = $exception.Message
         $err = $exception
    }
    }

    Write-Error -Message $err -ErrorAction SilentlyContinue
    $Host.UI.WriteErrorLine($errorMessage)
};

try {
    $openedWordInstance = [Runtime.Interopservices.Marshal]::GetActiveObject('Word.Application')
    Write-Stderr "Found active word instance followng docs open:"
    foreach ($doc in $openedWordInstance.Documents) {
        Write-Stderr "\t" + $doc.FullName
    }
}
catch {
    $openedWordInstance = $null
    Write-Stderr "No active word instance found"
}

$word = New-Object -ComObject Word.Application
foreach ($fileName in $files) {
    $file = Get-Item $fileName

    if ($file.PSIsContainer) {
        continue
    }

    if ($openedWordInstance) {
        $document = $openedWordInstance.Documents | Where-Object { ($_.FullName -eq $fileName) -or ($_.Name -eq $fileName) }
        if ($document) {
            Write-Stderr "Document $fileName is currently opened"
        }
        Write-Stderr "Document $fileName was not opened in active instance"
    }

    if (!$document) {
        # FIXME: ogarnąć jak zablokować wyskakiwaniu okienka "Document is locked for editing" które blokuje cały skrypt
        $document = $word.Documents.OpenNoRepairDialog($file.FullName, $false, $true)
    }

    $pdf_filename = "$($file.DirectoryName)\$($prefix)$($file.BaseName).pdf"

    $document.SaveAs([ref] $pdf_filename, [ref] 17) # 17 = pdf
}

$word.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($word)
Remove-Variable word
