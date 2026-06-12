# Render a monospace text file (an ASCII result card) to a PNG "screenshot".
# Usage: powershell -File scripts/text-to-png.ps1 <input.txt> <output.png>
param(
  [Parameter(Mandatory=$true)][string]$In,
  [Parameter(Mandatory=$true)][string]$Out
)
Add-Type -AssemblyName System.Drawing

$lines = Get-Content -LiteralPath $In -Encoding UTF8
# Trim leading blank lines
while ($lines.Count -gt 0 -and $lines[0].Trim() -eq "") { $lines = $lines[1..($lines.Count-1)] }

$font = New-Object System.Drawing.Font("Consolas", 13, [System.Drawing.FontStyle]::Regular)
$tmp = New-Object System.Drawing.Bitmap 1,1
$g0 = [System.Drawing.Graphics]::FromImage($tmp)
$charW = $g0.MeasureString("M", $font).Width
$lineH = [Math]::Ceiling($font.GetHeight($g0)) + 1
$maxLen = ($lines | Measure-Object -Property Length -Maximum).Maximum
$padX = 24; $padY = 20
$w = [int]([Math]::Ceiling($charW * $maxLen) + $padX*2)
$h = [int]($lineH * $lines.Count + $padY*2)
$g0.Dispose(); $tmp.Dispose()

$bmp = New-Object System.Drawing.Bitmap $w, $h
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit
$bg = [System.Drawing.ColorTranslator]::FromHtml("#0D1B2A")
$g.Clear($bg)
$fg = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#9BE7FF"))
$green = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#22C55E"))
$red = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#F87171"))
$amber = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#FBBF24"))

$y = $padY
foreach ($line in $lines) {
  $brush = $fg
  if ($line -match "\[PASS\]") { $brush = $green }
  elseif ($line -match "\[FAIL\]") { $brush = $red }
  elseif ($line -match "pass rate|Scheduler app|Tests passed|Avg ") { $brush = $amber }
  $g.DrawString($line, $font, $brush, $padX, $y)
  $y += $lineH
}
$g.Dispose()
$bmp.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Write-Output "wrote $Out ($w x $h)"
