$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$FrameDir = Join-Path $ScriptDir "user-action-video-frames"
$OutputPath = Join-Path $ScriptDir "bugbrief-ai-user-action-walkthrough.mp4"
$IconPath = Join-Path $ProjectRoot "extension\public\icons\icon-128.png"

$Width = 1280
$Height = 720
$Fps = 20
$DurationSeconds = 30
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

function BrushHex([string]$hex, [int]$alpha = 255) {
  return New-Object System.Drawing.SolidBrush (ColorHex $hex $alpha)
}

function PenHex([string]$hex, [float]$width = 1, [int]$alpha = 255) {
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
  $brush = BrushHex $color
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

function Ease([double]$value) {
  if ($value -lt 0) { return 0 }
  if ($value -gt 1) { return 1 }
  return $value * $value * (3 - (2 * $value))
}

function Type-Portion([string]$text, [double]$progress) {
  $progress = Ease $progress
  $count = [math]::Floor($text.Length * $progress)
  return $text.Substring(0, [math]::Max(0, [math]::Min($count, $text.Length)))
}

function Draw-ExtensionIcon($graphics, [float]$x, [float]$y, [float]$size = 28) {
  Fill-Round $graphics $x $y $size $size 6 (BrushHex "#0f172a")
  if (Test-Path $IconPath) {
    $icon = [System.Drawing.Image]::FromFile($IconPath)
    $graphics.DrawImage($icon, $x + ($size * 0.18), $y + ($size * 0.18), $size * 0.64, $size * 0.64)
    $icon.Dispose()
  } else {
    Draw-Text $graphics "B" "Segoe UI" ($size * 0.55) ([System.Drawing.FontStyle]::Bold) "#14b8a6" $x ($y + 2) $size $size $true
  }
}

function Draw-ClickRing($graphics, [float]$x, [float]$y, [double]$progress) {
  $progress = Ease $progress
  $radius = 10 + (32 * $progress)
  $alpha = [int](170 * (1 - $progress))
  $pen = PenHex "#14b8a6" 4 $alpha
  $graphics.DrawEllipse($pen, $x - $radius, $y - $radius, $radius * 2, $radius * 2)
  $pen.Dispose()
}

function Draw-Cursor($graphics, [float]$x, [float]$y) {
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
  $graphics.FillPath((BrushHex "#ffffff"), $cursor)
  $graphics.DrawPath((PenHex "#0f172a" 2), $cursor)
  $cursor.Dispose()
}

function Point-Lerp([float]$x1, [float]$y1, [float]$x2, [float]$y2, [double]$progress) {
  $p = Ease $progress
  return @{
    x = $x1 + (($x2 - $x1) * $p)
    y = $y1 + (($y2 - $y1) * $p)
  }
}

function Draw-BrowserShell($graphics, [bool]$pinned = $false) {
  $graphics.Clear((ColorHex "#e2e8f0"))
  Fill-Round $graphics 24 18 1232 684 18 (BrushHex "#ffffff")
  Draw-Round $graphics 24 18 1232 684 18 (PenHex "#cbd5e1" 1)
  $graphics.FillRectangle((BrushHex "#ffffff"), 24, 18, 1232, 56)
  $graphics.DrawLine((PenHex "#cbd5e1" 1), 24, 74, 1256, 74)

  $graphics.FillEllipse((BrushHex "#ef4444"), 48, 39, 13, 13)
  $graphics.FillEllipse((BrushHex "#f59e0b"), 70, 39, 13, 13)
  $graphics.FillEllipse((BrushHex "#22c55e"), 92, 39, 13, 13)

  Fill-Round $graphics 158 30 720 32 16 (BrushHex "#f8fafc")
  Draw-Round $graphics 158 30 720 32 16 (PenHex "#cbd5e1" 1)
  Draw-Text $graphics "https://example.com/checkout" "Segoe UI" 15 ([System.Drawing.FontStyle]::Regular) "#334155" 174 36 360 22

  Draw-Text $graphics "Extensions" "Segoe UI" 13 ([System.Drawing.FontStyle]::Regular) "#475569" 1024 36 70 20
  Draw-Text $graphics "..." "Segoe UI" 20 ([System.Drawing.FontStyle]::Bold) "#64748b" 1217 25 24 30 $true
  Fill-Round $graphics 1102 32 28 24 6 (BrushHex "#f8fafc")
  Draw-Round $graphics 1102 32 28 24 6 (PenHex "#cbd5e1" 1)
  Draw-Text $graphics "ext" "Segoe UI" 10 ([System.Drawing.FontStyle]::Bold) "#334155" 1102 36 28 14 $true

  if ($pinned) {
    Draw-ExtensionIcon $graphics 1142 31 28
  }
}

function Draw-CheckoutPage($graphics, [bool]$withSidePanel = $false) {
  $pageRight = if ($withSidePanel) { 844 } else { 1256 }
  $pageWidth = $pageRight - 24
  $graphics.FillRectangle((BrushHex "#f8fafc"), 24, 75, $pageWidth, 627)
  $gradientRect = [System.Drawing.Rectangle]::new(24, 75, $pageWidth, 627)
  $gradient = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    $gradientRect,
    (ColorHex "#ecfeff"),
    (ColorHex "#ffffff"),
    [System.Drawing.Drawing2D.LinearGradientMode]::ForwardDiagonal
  )
  $graphics.FillRectangle($gradient, $gradientRect)
  $gradient.Dispose()

  Draw-ExtensionIcon $graphics 68 112 42
  Draw-Text $graphics "Demo Shop" "Segoe UI" 24 ([System.Drawing.FontStyle]::Bold) "#020617" 122 118 190 32
  Draw-Text $graphics "Cart" "Segoe UI" 16 ([System.Drawing.FontStyle]::Regular) "#475569" ($pageRight - 220) 120 60 24
  Draw-Text $graphics "Checkout" "Segoe UI" 16 ([System.Drawing.FontStyle]::Regular) "#475569" ($pageRight - 160) 120 80 24
  Draw-Text $graphics "Help" "Segoe UI" 16 ([System.Drawing.FontStyle]::Regular) "#475569" ($pageRight - 70) 120 60 24

  Fill-Round $graphics 68 175 384 486 12 (BrushHex "#ffffff" 235)
  Draw-Round $graphics 68 175 384 486 12 (PenHex "#cbd5e1" 1)
  Draw-Text $graphics "CHECKOUT" "Segoe UI" 18 ([System.Drawing.FontStyle]::Bold) "#64748b" 98 208 180 26
  Draw-Text $graphics "Complete your" "Segoe UI" 38 ([System.Drawing.FontStyle]::Bold) "#020617" 98 240 320 48
  Draw-Text $graphics "order" "Segoe UI" 38 ([System.Drawing.FontStyle]::Bold) "#020617" 98 286 250 48
  Draw-Text $graphics "A realistic demo page with a blocked purchase flow." "Segoe UI" 18 ([System.Drawing.FontStyle]::Regular) "#64748b" 98 348 300 54

  foreach ($rect in @(
    @(98, 430, 138, 52),
    @(252, 430, 138, 52),
    @(98, 500, 292, 52),
    @(98, 570, 138, 52),
    @(252, 570, 138, 52)
  )) {
    Fill-Round $graphics $rect[0] $rect[1] $rect[2] $rect[3] 8 (BrushHex "#f8fafc")
    Draw-Round $graphics $rect[0] $rect[1] $rect[2] $rect[3] 8 (PenHex "#cbd5e1" 1)
  }
  Draw-Round $graphics 98 570 138 52 8 (PenHex "#fca5a5" 1.5)
  Fill-Round $graphics 98 636 292 46 8 (BrushHex "#fef2f2")
  Draw-Round $graphics 98 636 292 46 8 (PenHex "#fecaca" 1)
  Draw-Text $graphics "!  Payment could not be submitted." "Segoe UI" 15 ([System.Drawing.FontStyle]::Regular) "#dc2626" 116 650 250 20

  Fill-Round $graphics 498 175 310 236 12 (BrushHex "#ffffff" 235)
  Draw-Round $graphics 498 175 310 236 12 (PenHex "#cbd5e1" 1)
  Draw-Text $graphics "ORDER SUMMARY" "Segoe UI" 18 ([System.Drawing.FontStyle]::Bold) "#64748b" 522 206 210 26
  Draw-Text $graphics "Bug tracker seat" "Segoe UI" 16 ([System.Drawing.FontStyle]::Regular) "#334155" 522 236 180 24
  Draw-Text $graphics '$24' "Segoe UI" 16 ([System.Drawing.FontStyle]::Bold) "#334155" 746 236 46 24
  Draw-Text $graphics "Team workspace" "Segoe UI" 16 ([System.Drawing.FontStyle]::Regular) "#334155" 522 272 180 24
  Draw-Text $graphics '$16' "Segoe UI" 16 ([System.Drawing.FontStyle]::Bold) "#334155" 746 272 46 24
  Draw-Text $graphics "Tax" "Segoe UI" 16 ([System.Drawing.FontStyle]::Regular) "#334155" 522 308 180 24
  Draw-Text $graphics '$4' "Segoe UI" 16 ([System.Drawing.FontStyle]::Bold) "#334155" 756 308 36 24
  $graphics.DrawLine((PenHex "#cbd5e1" 1), 522, 346, 784, 346)
  Draw-Text $graphics "Total" "Segoe UI" 24 ([System.Drawing.FontStyle]::Bold) "#020617" 522 370 120 32
  Draw-Text $graphics '$44' "Segoe UI" 24 ([System.Drawing.FontStyle]::Bold) "#020617" 732 370 58 32
}

function Draw-ExtensionsMenu($graphics, [bool]$showPinned = $false) {
  Fill-Round $graphics 920 80 306 228 12 (New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(248, 255, 255, 255)))
  Draw-Round $graphics 920 80 306 228 12 (PenHex "#cbd5e1" 1)
  Draw-Text $graphics "Extensions" "Segoe UI" 18 ([System.Drawing.FontStyle]::Bold) "#0f172a" 944 102 160 28
  Draw-Text $graphics "Access requested" "Segoe UI" 13 ([System.Drawing.FontStyle]::Regular) "#64748b" 944 130 170 22
  $graphics.DrawLine((PenHex "#e2e8f0" 1), 944, 162, 1202, 162)
  Draw-ExtensionIcon $graphics 944 184 34
  Draw-Text $graphics "BugBrief AI" "Segoe UI" 15 ([System.Drawing.FontStyle]::Bold) "#0f172a" 990 187 120 22
  Draw-Text $graphics "Capture browser bugs" "Segoe UI" 12 ([System.Drawing.FontStyle]::Regular) "#64748b" 990 210 150 18
  $pinColor = if ($showPinned) { "#0f766e" } else { "#64748b" }
  Draw-Text $graphics "pin" "Segoe UI" 13 ([System.Drawing.FontStyle]::Bold) $pinColor 1156 192 32 20 $true
  Fill-Round $graphics 944 252 238 34 8 (BrushHex "#f8fafc")
  $pinMessage = if ($showPinned) { "Pinned to toolbar" } else { "Click the pin icon" }
  Draw-Text $graphics $pinMessage "Segoe UI" 13 ([System.Drawing.FontStyle]::Bold) "#0f766e" 964 260 190 20
}

function Draw-Popup($graphics) {
  Fill-Round $graphics 904 80 320 214 12 (New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(250, 255, 255, 255)))
  Draw-Round $graphics 904 80 320 214 12 (PenHex "#cbd5e1" 1)
  Draw-Text $graphics "BUGBRIEF AI" "Segoe UI" 13 ([System.Drawing.FontStyle]::Bold) "#0f766e" 928 104 150 22
  Draw-Text $graphics "Capture cleaner bug reports" "Segoe UI" 20 ([System.Drawing.FontStyle]::Bold) "#020617" 928 132 250 30
  Draw-Text $graphics "Open the side panel to capture the current tab and turn your notes into a PDF report." "Segoe UI" 15 ([System.Drawing.FontStyle]::Regular) "#475569" 928 166 252 52
  Fill-Round $graphics 928 230 248 46 8 (BrushHex "#0f172a")
  Draw-Text $graphics "Open BugBrief" "Segoe UI" 17 ([System.Drawing.FontStyle]::Bold) "#ffffff" 928 240 248 26 $true
}

function Draw-SidePanel($graphics, [double]$captureProgress = 0, [double]$typeProgress = 0, [bool]$showReport = $false) {
  $graphics.DrawLine((PenHex "#cbd5e1" 1), 844, 75, 844, 702)
  $graphics.FillRectangle((BrushHex "#f8fafc"), 845, 75, 411, 627)
  Draw-Text $graphics "BUGBRIEF AI" "Segoe UI" 13 ([System.Drawing.FontStyle]::Bold) "#0f766e" 874 94 180 22
  Draw-Text $graphics "Turn a browser bug into a" "Segoe UI" 24 ([System.Drawing.FontStyle]::Bold) "#020617" 874 121 320 32
  Draw-Text $graphics "developer-ready report." "Segoe UI" 24 ([System.Drawing.FontStyle]::Bold) "#020617" 874 151 320 32
  Draw-Text $graphics "Capture the visible tab, add what you expected, and generate a PDF report." "Segoe UI" 14 ([System.Drawing.FontStyle]::Regular) "#475569" 874 190 340 44

  if (-not $showReport) {
    Fill-Round $graphics 874 248 340 46 8 (BrushHex "#0f172a")
    Draw-Text $graphics "Capture Bug" "Segoe UI" 17 ([System.Drawing.FontStyle]::Bold) "#ffffff" 874 258 340 26 $true
  }

  if ($captureProgress -gt 0.08 -and -not $showReport) {
    Fill-Round $graphics 874 310 340 88 8 (BrushHex "#ffffff")
    Draw-Round $graphics 874 310 340 88 8 (PenHex "#cbd5e1" 1)
    $graphics.FillRectangle((BrushHex "#0f172a"), 874, 310, 340, 24)
    $graphics.FillRectangle((BrushHex "#94a3b8"), 894, 350, 120, 8)
    $graphics.FillRectangle((BrushHex "#cbd5e1"), 894, 369, 190, 7)
    $graphics.FillRectangle((BrushHex "#cbd5e1"), 894, 384, 150, 7)

    Fill-Round $graphics 874 412 340 112 8 (BrushHex "#ffffff")
    Draw-Round $graphics 874 412 340 112 8 (PenHex "#cbd5e1" 1)
    Draw-Text $graphics "Page URL" "Segoe UI" 12 ([System.Drawing.FontStyle]::Bold) "#334155" 890 428 100 18
    Draw-Text $graphics "https://example.com/checkout" "Segoe UI" 12 ([System.Drawing.FontStyle]::Regular) "#475569" 890 446 230 18
    Draw-Text $graphics "Page title" "Segoe UI" 12 ([System.Drawing.FontStyle]::Bold) "#334155" 890 472 100 18
    Draw-Text $graphics "Demo Shop Checkout" "Segoe UI" 12 ([System.Drawing.FontStyle]::Regular) "#475569" 890 490 160 18
  }

  $goal = Type-Portion "Submit payment after entering valid checkout details." ([math]::Min([math]::Max(($typeProgress - 0.0) / 0.32, 0), 1))
  $problem = Type-Portion "The Submit payment button stayed disabled and showed a payment error." ([math]::Min([math]::Max(($typeProgress - 0.34) / 0.34, 0), 1))
  $notes = Type-Portion "Happened twice in Chrome with the same test account." ([math]::Min([math]::Max(($typeProgress - 0.70) / 0.30, 0), 1))

  if ($captureProgress -gt 0.25 -and -not $showReport) {
    Draw-Text $graphics "What were you trying to do?" "Segoe UI" 13 ([System.Drawing.FontStyle]::Bold) "#334155" 874 540 220 20
    Fill-Round $graphics 874 562 340 44 8 (BrushHex "#ffffff")
    Draw-Round $graphics 874 562 340 44 8 (PenHex "#cbd5e1" 1)
    Draw-Text $graphics $goal "Segoe UI" 12 ([System.Drawing.FontStyle]::Regular) "#334155" 890 574 300 18

    Draw-Text $graphics "What happened instead?" "Segoe UI" 13 ([System.Drawing.FontStyle]::Bold) "#334155" 874 616 220 20
    Fill-Round $graphics 874 638 340 44 8 (BrushHex "#ffffff")
    Draw-Round $graphics 874 638 340 44 8 (PenHex "#cbd5e1" 1)
    Draw-Text $graphics $problem "Segoe UI" 12 ([System.Drawing.FontStyle]::Regular) "#334155" 890 650 305 18
  }

  if ($showReport) {
    Draw-Text $graphics "GENERATED REPORT" "Segoe UI" 13 ([System.Drawing.FontStyle]::Bold) "#0f766e" 874 246 190 22
    Draw-Text $graphics "Checkout payment submission is blocked" "Segoe UI" 17 ([System.Drawing.FontStyle]::Bold) "#020617" 874 274 350 24
    Fill-Round $graphics 874 312 132 34 8 (BrushHex "#ffffff")
    Draw-Round $graphics 874 312 132 34 8 (PenHex "#cbd5e1" 1)
    Draw-Text $graphics "Download PDF" "Segoe UI" 12 ([System.Drawing.FontStyle]::Bold) "#334155" 874 320 132 18 $true
    Fill-Round $graphics 874 364 340 238 8 (BrushHex "#ffffff")
    Draw-Round $graphics 874 364 340 238 8 (PenHex "#cbd5e1" 1)
    Draw-Text $graphics "Summary" "Segoe UI" 12 ([System.Drawing.FontStyle]::Bold) "#0f172a" 894 382 260 18
    Draw-Text $graphics "Payment submission is blocked after valid checkout details are entered." "Segoe UI" 11 ([System.Drawing.FontStyle]::Regular) "#475569" 894 404 290 36
    Draw-Text $graphics "Steps to Reproduce" "Segoe UI" 12 ([System.Drawing.FontStyle]::Bold) "#0f172a" 894 452 260 18
    Draw-Text $graphics "1. Likely steps - needs confirmation.`n2. Open checkout.`n3. Enter valid payment details.`n4. Attempt to submit payment." "Segoe UI" 11 ([System.Drawing.FontStyle]::Regular) "#475569" 894 474 290 66
    Draw-Text $graphics "Evidence" "Segoe UI" 12 ([System.Drawing.FontStyle]::Bold) "#0f172a" 894 552 260 18
    Draw-Text $graphics "The downloaded PDF includes the captured screenshot." "Segoe UI" 11 ([System.Drawing.FontStyle]::Regular) "#475569" 894 574 290 28
  }
}

function Draw-StepBadge($graphics, [string]$step, [string]$title, [string]$body) {
  Fill-Round $graphics 74 502 570 136 16 (New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(235, 15, 23, 42)))
  Draw-Round $graphics 74 502 570 136 16 (PenHex "#14b8a6" 1.5)
  Draw-Text $graphics $step "Segoe UI" 14 ([System.Drawing.FontStyle]::Bold) "#5eead4" 100 522 190 22
  Draw-Text $graphics $title "Segoe UI" 28 ([System.Drawing.FontStyle]::Bold) "#ffffff" 100 548 500 38
  Draw-Text $graphics $body "Segoe UI" 16 ([System.Drawing.FontStyle]::Regular) "#cbd5e1" 100 588 500 42
}

function Draw-Intro($graphics) {
  $graphics.Clear((ColorHex "#f8fafc"))
  $rect = New-Object System.Drawing.Rectangle(0, 0, $Width, $Height)
  $gradient = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    $rect,
    (ColorHex "#f8fafc"),
    (ColorHex "#ecfeff"),
    [System.Drawing.Drawing2D.LinearGradientMode]::ForwardDiagonal
  )
  $graphics.FillRectangle($gradient, $rect)
  $gradient.Dispose()
  $graphics.FillEllipse((BrushHex "#ccfbf1" 200), 930, -170, 460, 460)
  Draw-ExtensionIcon $graphics 480 142 56
  Draw-Text $graphics "BUGBRIEF AI" "Segoe UI" 26 ([System.Drawing.FontStyle]::Bold) "#0f766e" 552 154 250 36
  Draw-Text $graphics "Full user walkthrough" "Segoe UI" 56 ([System.Drawing.FontStyle]::Bold) "#020617" 180 270 920 70 $true
  Draw-Text $graphics "Pin the extension, capture the bug, fill the fields, and generate a report." "Segoe UI" 24 ([System.Drawing.FontStyle]::Regular) "#475569" 220 360 840 40 $true
  Fill-Round $graphics 454 460 372 56 10 (BrushHex "#0f172a")
  Draw-Text $graphics "Follow the clicks" "Segoe UI" 22 ([System.Drawing.FontStyle]::Bold) "#ffffff" 454 472 372 30 $true
  $graphics.FillRectangle((BrushHex "#0f172a"), 0, 704, 1280, 16)
  $graphics.FillRectangle((BrushHex "#14b8a6"), 0, 698, 1280, 6)
}

function Draw-Outro($graphics) {
  $graphics.Clear((ColorHex "#ecfeff"))
  $graphics.FillEllipse((BrushHex "#ccfbf1" 210), 900, -170, 460, 460)
  Draw-ExtensionIcon $graphics 468 150 56
  Draw-Text $graphics "BUGBRIEF AI" "Segoe UI" 26 ([System.Drawing.FontStyle]::Bold) "#0f766e" 540 162 250 36
  Draw-Text $graphics "From bug to brief in under a minute" "Segoe UI" 52 ([System.Drawing.FontStyle]::Bold) "#020617" 110 300 1060 70 $true
  Draw-Text $graphics "A simple Chrome side panel for cleaner developer-ready bug reports." "Segoe UI" 24 ([System.Drawing.FontStyle]::Regular) "#475569" 220 390 840 40 $true
  Fill-Round $graphics 464 480 352 56 10 (BrushHex "#0f172a")
  Draw-Text $graphics "Capture. Generate. Share." "Segoe UI" 22 ([System.Drawing.FontStyle]::Bold) "#ffffff" 464 492 352 30 $true
  $graphics.FillRectangle((BrushHex "#0f172a"), 0, 704, 1280, 16)
  $graphics.FillRectangle((BrushHex "#14b8a6"), 0, 698, 1280, 6)
}

function Draw-Scene($graphics, [double]$t) {
  if ($t -lt 2.2) {
    Draw-Intro $graphics
    return
  }

  if ($t -lt 5.5) {
    $sceneT = $t - 2.2
    Draw-BrowserShell $graphics $false
    Draw-CheckoutPage $graphics $false
    Draw-ExtensionsMenu $graphics ($sceneT -gt 2.0)
    Draw-StepBadge $graphics "STEP 1" "Pin BugBrief" "Open Extensions and pin BugBrief AI to the toolbar."

    if ($sceneT -lt 1.3) {
      $p = Point-Lerp 760 330 1114 44 ($sceneT / 1.3)
      Draw-Cursor $graphics $p.x $p.y
      Draw-ClickRing $graphics 1115 44 ([math]::Min([math]::Max(($sceneT - 0.8) / 0.5, 0), 1))
    } else {
      $p = Point-Lerp 1114 44 1173 202 ([math]::Min(($sceneT - 1.3) / 1.2, 1))
      Draw-Cursor $graphics $p.x $p.y
      Draw-ClickRing $graphics 1172 202 ([math]::Min([math]::Max(($sceneT - 2.0) / 0.6, 0), 1))
    }
    return
  }

  if ($t -lt 8.2) {
    $sceneT = $t - 5.5
    Draw-BrowserShell $graphics $true
    Draw-CheckoutPage $graphics $false
    Draw-StepBadge $graphics "STEP 2" "Open the extension" "Click the pinned BugBrief icon, then open the side panel."
    Draw-Popup $graphics
    if ($sceneT -lt 1.2) {
      $p = Point-Lerp 1172 202 1156 44 ($sceneT / 1.2)
      Draw-Cursor $graphics $p.x $p.y
      Draw-ClickRing $graphics 1156 44 ([math]::Min([math]::Max(($sceneT - 0.7) / 0.5, 0), 1))
    } else {
      $p = Point-Lerp 1156 44 1038 252 ([math]::Min(($sceneT - 1.2) / 1.0, 1))
      Draw-Cursor $graphics $p.x $p.y
      Draw-ClickRing $graphics 1038 252 ([math]::Min([math]::Max(($sceneT - 1.9) / 0.5, 0), 1))
    }
    return
  }

  if ($t -lt 12.0) {
    $sceneT = $t - 8.2
    Draw-BrowserShell $graphics $true
    Draw-CheckoutPage $graphics $true
    Draw-SidePanel $graphics ([math]::Min($sceneT / 2.0, 1)) 0 $false
    Draw-StepBadge $graphics "STEP 3" "Capture the bug" "Click Capture Bug to collect the visible screenshot and page details."
    $p = Point-Lerp 1038 252 1028 270 ([math]::Min($sceneT / 1.0, 1))
    Draw-Cursor $graphics $p.x $p.y
    Draw-ClickRing $graphics 1028 270 ([math]::Min([math]::Max(($sceneT - 0.6) / 0.5, 0), 1))
    return
  }

  if ($t -lt 19.5) {
    $sceneT = $t - 12.0
    Draw-BrowserShell $graphics $true
    Draw-CheckoutPage $graphics $true
    Draw-SidePanel $graphics 1 ([math]::Min($sceneT / 6.5, 1)) $false
    Draw-StepBadge $graphics "STEP 4" "Fill the bug details" "Add the user goal, actual problem, and optional extra notes."
    $targetY = if ($sceneT -lt 2.2) { 582 } elseif ($sceneT -lt 4.8) { 658 } else { 666 }
    Draw-Cursor $graphics 1176 $targetY
    if ($sceneT -lt 0.8) { Draw-ClickRing $graphics 1016 582 ([math]::Min($sceneT / 0.8, 1)) }
    return
  }

  if ($t -lt 24.5) {
    $sceneT = $t - 19.5
    Draw-BrowserShell $graphics $true
    Draw-CheckoutPage $graphics $true
    if ($sceneT -lt 1.4) {
      Draw-SidePanel $graphics 1 1 $false
      Fill-Round $graphics 874 692 340 42 8 (BrushHex "#0f172a")
      Draw-Text $graphics "Generate Bug Report" "Segoe UI" 17 ([System.Drawing.FontStyle]::Bold) "#ffffff" 874 700 340 24 $true
      Draw-StepBadge $graphics "STEP 5" "Generate the report" "Send the screenshot, page context, and notes to the backend AI."
      Draw-Cursor $graphics 1030 708
      Draw-ClickRing $graphics 1030 708 ([math]::Min([math]::Max(($sceneT - 0.3) / 0.6, 0), 1))
    } else {
      Draw-SidePanel $graphics 1 1 $true
      Draw-StepBadge $graphics "STEP 6" "Download the PDF" "Save a developer-ready report that includes the captured screenshot."
      Draw-Cursor $graphics 930 326
      Draw-ClickRing $graphics 930 326 ([math]::Min([math]::Max(($sceneT - 2.0) / 0.8, 0), 1))
    }
    return
  }

  if ($t -lt 27.5) {
    Draw-BrowserShell $graphics $true
    Draw-CheckoutPage $graphics $true
    Draw-SidePanel $graphics 1 1 $true
    Draw-StepBadge $graphics "DONE" "Saved locally" "Reports stay in local Chrome history for quick follow-up."
    Draw-Cursor $graphics 1070 566
    Draw-ClickRing $graphics 1070 566 ([math]::Min([math]::Max(($t - 24.8) / 0.8, 0), 1))
    return
  }

  Draw-Outro $graphics
}

for ($frame = 0; $frame -lt $TotalFrames; $frame++) {
  $t = $frame / $Fps
  $bitmap = New-Object System.Drawing.Bitmap($Width, $Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

  Draw-Scene $graphics $t

  $framePath = Join-Path $FrameDir ("frame-{0:D4}.png" -f $frame)
  $bitmap.Save($framePath, [System.Drawing.Imaging.ImageFormat]::Png)
  $graphics.Dispose()
  $bitmap.Dispose()
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
