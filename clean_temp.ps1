$targetFolder = "c:\Users\valiantlion\Desktop\OMNIA CREATA\temp"
$deleted = 0

Write-Host "Starting scan for empty directories in $targetFolder..."

# Loop until no more empty directories are found (to handle nested empty directories)
do {
    $dirs = Get-ChildItem -Path $targetFolder -Directory -Recurse | Where-Object { 
        (Get-ChildItem -Path $_.FullName -Force).Count -eq 0 
    }
    
    if ($dirs) {
        foreach ($dir in $dirs) {
            Write-Host "Removing empty directory: $($dir.FullName)"
            Remove-Item -Path $dir.FullName -Force
            $deleted++
        }
    }
} while ($dirs)

Write-Host "Finished cleaning. Total empty directories removed: $deleted"
