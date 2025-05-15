# PowerShell script to fix imports in UI components
$uiDir = "c:\Users\Ahsanul\Downloads\LeadHunter\LeadHunter\client\src\components\ui"

# Fix @/lib/utils imports
Get-ChildItem -Path $uiDir -Filter "*.tsx" | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    $updatedContent = $content -replace 'import \{ cn \} from "@/lib/utils"', 'import { cn } from "../../lib/utils"'
    if ($content -ne $updatedContent) {
        Set-Content -Path $_.FullName -Value $updatedContent
        Write-Host "Fixed lib/utils import in $($_.Name)"
    }
}

# Fix @/components/ui imports
Get-ChildItem -Path $uiDir -Filter "*.tsx" | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    $updatedContent = $content -replace 'from "@/components/ui/([^"]+)"', 'from "./`$1"'
    if ($content -ne $updatedContent) {
        Set-Content -Path $_.FullName -Value $updatedContent
        Write-Host "Fixed components/ui imports in $($_.Name)"
    }
}

# Fix pagination.tsx with special case
$paginationPath = Join-Path $uiDir "pagination.tsx"
if (Test-Path $paginationPath) {
    $content = Get-Content $paginationPath -Raw
    $updatedContent = $content -replace 'import \{ cn \} from "@/lib/utils"', 'import { cn } from "../../lib/utils"'
    if ($content -ne $updatedContent) {
        Set-Content -Path $paginationPath -Value $updatedContent
        Write-Host "Fixed lib/utils import in pagination.tsx"
    }
}

Write-Host "All imports fixed!"
