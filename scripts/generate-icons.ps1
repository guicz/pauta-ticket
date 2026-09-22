Add-Type -AssemblyName System.Drawing
$iconDirectory = Join-Path $PSScriptRoot '../public/icons'
New-Item -ItemType Directory -Force -Path $iconDirectory | Out-Null
foreach ($size in @(192, 512)) {
  $bitmap = [System.Drawing.Bitmap]::new($size, $size)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#820ad1'))
  $pen = [System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml('#ffffff'), $size * 0.035)
  $graphics.DrawRectangle($pen, $size * 0.29, $size * 0.25, $size * 0.42, $size * 0.52)
  $graphics.DrawLine($pen, $size * 0.38, $size * 0.2, $size * 0.62, $size * 0.2)
  $graphics.DrawLine($pen, $size * 0.38, $size * 0.43, $size * 0.62, $size * 0.43)
  $graphics.DrawLine($pen, $size * 0.38, $size * 0.53, $size * 0.62, $size * 0.53)
  $graphics.DrawLine($pen, $size * 0.38, $size * 0.63, $size * 0.52, $size * 0.63)
  $bitmap.Save((Join-Path $iconDirectory "pauta-$size.png"), [System.Drawing.Imaging.ImageFormat]::Png)
  $pen.Dispose(); $graphics.Dispose(); $bitmap.Dispose()
}
