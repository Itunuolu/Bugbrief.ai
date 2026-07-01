$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$FrameDir = Join-Path $ScriptDir "demo-video-frames"
$OutputPath = Join-Path $ScriptDir "bugbrief-ai-demo-walkthrough-20s.mp4"
$IconPath = Join-Path $ProjectRoot "extension\public\icons\icon-128.png"

$CaptureImagePath = Join-Path $ScriptDir "screenshot-01-capture-context-1280x800.png"
$ReportImagePath = Join-Path $ScriptDir "screenshot-02-generated-report-1280x800.png"
$HistoryImagePath = Join-Path $ScriptDir "screenshot-03-local-history-1280x800.png"

$Width = 1280
$Height = 720
$Fps = 30
$DurationSeconds = 20
$TotalFrames = $Fps * $DurationSeconds

New-Item -ItemType Directory -Force -Path $FrameDir | Out-Null
Get-ChildItem -Path $FrameDir -Filter "frame-*.png" -ErrorAction SilentlyContinue | Remove-Item -Force

function ColorHex([string]$hex, [int]$alpha = 255) {
  $hex = $hex.TrimStart("#")
  return [System.Drawing.Color]::FromArgb(
    $alpha,
    [Convert]::ToInt32($hex.Substring(0, 2), 16),
    [Convert]::ToInt32($hex.Substring(2, 2), 16),
    [Convert]::ToInt32($hex.Substring(4, 2), 16)
  )
}

function New-Brush([string]$hex, [int]$alpha = 255) {
  return New-Object System.Drawing.SolidBrush (ColorHex $hex $alpha)
}

function New-Pen([string]$hex, [float]$width = 1, [int]$alpha = 255) {
  return New-Object System.Drawing.Pen((ColorHex $hex $alpha), $width)
}

function New-RoundedPath([float]$x, [float]$y, [float]$w, [float]$h, [float]$r) {
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  $path.AddArc($x, $y, $d, $d, 180, 90)
  $path.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $path.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
  $path.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $path.CloseFigure()
  return $path
}

function Fill-Round($graphics, [float]$x, [float]$y, [float]$w, [float]$h, [float]$r, $brush) {
  $path = New-RoundedPath $x $y $w $h $r
  $graphics.FillPath($brush, $path)
  $path.Dispose()
}

function Draw-Round($graphics, [float]$x, [float]$y, [float]$w, [float]$h, [float]$r, $pen) {
  $path = New-RoundedPath $x $y $w $h $r
  $graphics.DrawPath($pen, $path)
  $path.Dispose()
}

function Draw-Text(
  $graphics,
  [string]$text,
  [string]$fontName,
  [float]$size,
  [System.Drawing.FontStyle]$style,
  [string]$color,
  [float]$x,
  [float]$y,
  [float]$w,
  [float]$h,
  [bool]$center = $false
) {
  $font = New-Object System.Drawing.Font($fontName, $size, $style, [System.Drawing.GraphicsUnit]::Pixel)
  $brush = New-Brush $color
  $format = New-Object System.Drawing.StringFormat
  $format.Trimming = [System.Drawing.StringTrimming]::EllipsisCharacter
  if ($center) {
    $format.Alignment = [System.Drawing.StringAlignment]::Center
    $format.LineAlignment = [System.Drawing.StringAlignment]::Center
  }
  $graphics.DrawString($text, $font, $brush, (New-Object System.Drawing.RectangleF($x, $y, $w, $h)), $format)
  $format.Dispose()
  $brush.Dispose()
  $font.Dispose()
}

function Draw-Background($graphics) {
  $rect = New-Object System.Drawing.Rectangle(0, 0, $Width, $Height)
  $gradient = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    $rect,
    (ColorHex "#f8fafc"),
    (ColorHex "#ecfeff"),
    [System.Drawing.Drawing2D.LinearGradientMode]::ForwardDiagonal
  )
  $graphics.FillRectangle($gradient, $rect)
  $gradient.Dispose()

  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $path.AddEllipse(930, -170, 460, 460)
  $graphics.FillPath((New-Brush "#ccfbf1" 190), $path)
  $path.Dispose()

  $graphics.FillRectangle((New-Brush "#0f172a"), 0, 704, $Width, 16)
  $graphics.FillRectangle((New-Brush "#14b8a6"), 0, 698, $Width, 6)
}

function Draw-LogoLockup($graphics, [float]$x, [float]$y, [float]$scale = 1) {
  $box = 48 * $scale
  Fill-Round $graphics $x $y $box $box (10 * $scale) (New-Brush "#0f172a")
  if (Test-Path $IconPath) {
    $icon = [System.Drawing.Image]::FromFile($IconPath)
    $graphics.DrawImage($icon, $x + (8 * $scale), $y + (8 * $scale), 32 * $scale, 32 * $scale)
    $icon.Dispose()
  } else {
    Draw-Text $graphics "B" "Segoe UI" (26 * $scale) ([System.Drawing.FontStyle]::Bold) "#ffffff" ($x + 14) ($y + 6) 28 32
  }
  Draw-Text $graphics "BUGBRIEF AI" "Segoe UI" (20 * $scale) ([System.Drawing.FontStyle]::Bold) "#0f766e" ($x + (62 * $scale)) ($y + (9 * $scale)) (240 * $scale) (30 * $scale)
}

function Ease([double]$value) {
  if ($value -lt 0) { return 0 }
  if ($value -gt 1) { return 1 }
  return $value * $value * (3 - (2 * $value))
}

function Draw-Screenshot($graphics, $image, [double]$timeInScene) {
  $baseW = 1152
  $baseH = 720
  $zoom = 1 + (0.012 * (Ease([math]::Min($timeInScene / 2.5, 1))))
  $w = $baseW * $zoom
  $h = $baseH * $zoom
  $x = ($Width - $w) / 2
  $y = ($Height - $h) / 2

  Fill-Round $graphics ($x + 10) ($y + 13) $w $h 18 (New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(30, 15, 23, 42)))
  Draw-Round $graphics $x $y $w $h 18 (New-Pen "#cbd5e1" 1)
  $graphics.DrawImage($image, $x, $y, $w, $h)
}

function Draw-Caption($graphics, [string]$kicker, [string]$title, [string]$body) {
  Fill-Round $graphics 74 492 610 138 16 (New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(232, 15, 23, 42)))
  Draw-Round $graphics 74 492 610 138 16 (New-Pen "#14b8a6" 1.4)
  Draw-Text $graphics $kicker "Segoe UI" 14 ([System.Drawing.FontStyle]::Bold) "#5eead4" 100 512 550 22
  Draw-Text $graphics $title "Segoe UI" 28 ([System.Drawing.FontStyle]::Bold) "#ffffff" 100 538 550 38
  Draw-Text $graphics $body "Segoe UI" 16 ([System.Drawing.FontStyle]::Regular) "#cbd5e1" 100 578 540 42
}

function Draw-Cursor($graphics, [float]$x, [float]$y, [double]$pulse) {
  $pulse = Ease $pulse
  $radius = 18 + (22 * $pulse)
  $alpha = [int](120 * (1 - $pulse))
  $pulseBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb($alpha, 20, 184, 166))
  $graphics.FillEllipse($pulseBrush, $x - $radius, $y - $radius, $radius * 2, $radius * 2)
  $pulseBrush.Dispose()

  $cursor = New-Object System.Drawing.Drawing2D.GraphicsPath
  $cursor.AddPolygon([System.Drawing.PointF[]]@(
    ([System.Drawing.PointF]::new($x, $y)),
    ([System.Drawing.PointF]::new(($x + 2), ($y + 38))),
    ([System.Drawing.PointF]::new(($x + 11), ($y + 28))),
    ([System.Drawing.PointF]::new(($x + 21), ($y + 50))),
    ([System.Drawing.PointF]::new(($x + 32), ($y + 45))),
    ([System.Drawing.PointF]::new(($x + 21), ($y + 24))),
    ([System.Drawing.PointF]::new(($x + 35), ($y + 24)))
  ))
  $graphics.FillPath((New-Brush "#ffffff"), $cursor)
  $graphics.DrawPath((New-Pen "#0f172a" 2), $cursor)
  $cursor.Dispose()
}

function Draw-Intro($graphics, [double]$t) {
  Draw-Background $graphics
  Draw-LogoLockup $graphics 475 132 1.25
  Draw-Text $graphics "Turn browser bugs into" "Segoe UI" 56 ([System.Drawing.FontStyle]::Bold) "#020617" 220 245 840 70 $true
  Draw-Text $graphics "developer-ready reports" "Segoe UI" 56 ([System.Drawing.FontStyle]::Bold) "#020617" 220 308 840 76 $true
  Draw-Text $graphics "Capture the tab, add notes, download a PDF, and save history." "Segoe UI" 24 ([System.Drawing.FontStyle]::Regular) "#475569" 240 404 800 38 $true

  Fill-Round $graphics 430 486 420 56 10 (New-Brush "#0f172a")
  Draw-Text $graphics "BugBrief AI walkthrough" "Segoe UI" 22 ([System.Drawing.FontStyle]::Bold) "#ffffff" 430 497 420 34 $true
}

function Draw-Outro($graphics) {
  Draw-Background $graphics
  Draw-LogoLockup $graphics 470 152 1.28
  Draw-Text $graphics "Capture. Generate. Share." "Segoe UI" 56 ([System.Drawing.FontStyle]::Bold) "#020617" 160 285 960 78 $true
  Draw-Text $graphics "BugBrief AI turns browser issues into practical developer reports." "Segoe UI" 24 ([System.Drawing.FontStyle]::Regular) "#475569" 230 376 820 38 $true
  Fill-Round $graphics 468 468 344 56 10 (New-Brush "#0f172a")
  Draw-Text $graphics "Ready for testers and teams" "Segoe UI" 21 ([System.Drawing.FontStyle]::Bold) "#ffffff" 468 480 344 30 $true
}

$captureImage = [System.Drawing.Image]::FromFile($CaptureImagePath)
$reportImage = [System.Drawing.Image]::FromFile($ReportImagePath)
$historyImage = [System.Drawing.Image]::FromFile($HistoryImagePath)

try {
  for ($frame = 0; $frame -lt $TotalFrames; $frame++) {
    $t = $frame / $Fps
    $bitmap = New-Object System.Drawing.Bitmap($Width, $Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    if ($t -lt 2) {
      Draw-Intro $graphics $t
    } elseif ($t -lt 6) {
      $sceneT = $t - 2
      Draw-Background $graphics
      Draw-Screenshot $graphics $captureImage $sceneT
      Draw-Caption $graphics "STEP 1" "Capture the visible tab" "Collect screenshot, URL, page title, timestamp, and browser details."
      Draw-Cursor $graphics 1018 236 ([math]::Min([math]::Max(($sceneT - 0.8) / 1.1, 0), 1))
    } elseif ($t -lt 10) {
      $sceneT = $t - 6
      Draw-Background $graphics
      Draw-Screenshot $graphics $captureImage $sceneT
      Draw-Caption $graphics "STEP 2" "Add focused bug notes" "Add the goal, actual problem, and notes developers need to reproduce it."
      Draw-Cursor $graphics 1028 600 ([math]::Min([math]::Max(($sceneT - 0.8) / 1.1, 0), 1))
    } elseif ($t -lt 15) {
      $sceneT = $t - 10
      Draw-Background $graphics
      Draw-Screenshot $graphics $reportImage $sceneT
      Draw-Caption $graphics "STEP 3" "Download PDF" "The backend returns a structured bug report, and the PDF includes the screenshot."
      Draw-Cursor $graphics 923 317 ([math]::Min([math]::Max(($sceneT - 1.1) / 1.1, 0), 1))
    } elseif ($t -lt 18.5) {
      $sceneT = $t - 15
      Draw-Background $graphics
      Draw-Screenshot $graphics $historyImage $sceneT
      Draw-Caption $graphics "STEP 4" "Keep local history" "Reports are saved locally in Chrome storage for quick follow-up."
      Draw-Cursor $graphics 1026 642 ([math]::Min([math]::Max(($sceneT - 0.8) / 1.1, 0), 1))
    } else {
      Draw-Outro $graphics
    }

    $framePath = Join-Path $FrameDir ("frame-{0:D4}.png" -f $frame)
    $bitmap.Save($framePath, [System.Drawing.Imaging.ImageFormat]::Png)
    $graphics.Dispose()
    $bitmap.Dispose()
  }
} finally {
  $captureImage.Dispose()
  $reportImage.Dispose()
  $historyImage.Dispose()
}

$ffmpeg = $env:FFMPEG_PATH
if (-not $ffmpeg) {
  $ffmpeg = & npx.cmd --yes -p ffmpeg-static node -e "process.stdout.write(require('ffmpeg-static'))"
}

if (-not (Test-Path $ffmpeg)) {
  throw "Unable to find ffmpeg. Set FFMPEG_PATH to an ffmpeg binary path and rerun this script."
}

& $ffmpeg -y `
  -framerate $Fps `
  -i (Join-Path $FrameDir "frame-%04d.png") `
  -c:v libx264 `
  -pix_fmt yuv420p `
  -movflags +faststart `
  $OutputPath

Write-Output $OutputPath
