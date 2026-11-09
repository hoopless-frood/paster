local json = require("lib.json")

local SUPPORTED_VERSION = 1
local DEFAULT_COMPOSITION = "examples/composition.json"

local WINDOW_COLOR = { 0.15, 0.15, 0.17 }
local PLACEHOLDER_FILL = { 0.96, 0.87, 0.91 }
local PLACEHOLDER_LINE = { 0.62, 0.36, 0.5 }
local PLACEHOLDER_TEXT = { 0.2, 0.2, 0.2 }

local composition
local images = {} -- love Image by asset id; a missing entry draws a placeholder

local function readFile(path)
  local file, openError = io.open(path, "rb")
  if not file then
    return nil, openError
  end
  local contents = file:read("*a")
  file:close()
  return contents
end

-- Same rules as @paster/core's validator: a composition must not be able to
-- read files from outside its own folder.
local function isSafeAssetPath(path)
  if type(path) ~= "string" or path == "" or path:match("^[/\\]") then
    return false
  end
  if path:match("^%a:[/\\]") or path:match("^%a[%w+.-]*://") then
    return false
  end
  for segment in (path .. "/"):gmatch("(.-)[/\\]") do
    if segment == "" or segment == ".." then
      return false
    end
  end
  return true
end

local function fail(message)
  error("Invalid composition: " .. message, 0)
end

local function isPositive(value)
  return type(value) == "number" and value > 0
end

-- Not a replacement for validateComposition: this only rejects what would
-- otherwise crash or misdraw here. Validate untrusted files with @paster/core.
local function checkComposition(data)
  if type(data) ~= "table" then
    fail("expected an object")
  end
  if data.version ~= SUPPORTED_VERSION then
    fail(("unsupported version %s (expected %d)"):format(tostring(data.version), SUPPORTED_VERSION))
  end
  if type(data.layouts) ~= "table" or #data.layouts == 0 then
    fail("layouts must be a non-empty array")
  end

  local baseLayouts = 0
  for _, layout in ipairs(data.layouts) do
    if type(layout.minWidth) ~= "number" or layout.minWidth < 0 then
      fail(("layout %s: minWidth must be a non-negative number"):format(tostring(layout.id)))
    end
    if layout.minWidth == 0 then
      baseLayouts = baseLayouts + 1
    end
    if not (isPositive(layout.width) and isPositive(layout.height)) then
      fail(("layout %s: width and height must be positive"):format(tostring(layout.id)))
    end
    if type(layout.items) ~= "table" then
      fail(("layout %s: items must be an array"):format(tostring(layout.id)))
    end
    for _, item in ipairs(layout.items) do
      local hasGeometry = type(item.x) == "number" and type(item.y) == "number"
        and isPositive(item.width) and isPositive(item.height)
        and type(item.zIndex) == "number"
        and (item.rotation == nil or type(item.rotation) == "number")
      if not hasGeometry then
        fail(("item %s in layout %s: invalid geometry"):format(tostring(item.id), tostring(layout.id)))
      end
    end
  end
  if baseLayouts ~= 1 then
    fail("exactly one layout must have minWidth 0")
  end

  for _, asset in ipairs(data.assets or {}) do
    if not isSafeAssetPath(asset.path) then
      fail(("asset %s: unsafe path %s"):format(tostring(asset.id), tostring(asset.path)))
    end
  end
end

local function loadComposition(path)
  local text, readError = readFile(path)
  if not text then
    error("Could not read composition: " .. readError, 0)
  end

  local decoded, data = pcall(json.decode, text)
  if not decoded then
    error(("Could not parse %s: %s"):format(path, tostring(data)), 0)
  end

  checkComposition(data)

  table.sort(data.layouts, function(a, b) return a.minWidth < b.minWidth end)
  for _, layout in ipairs(data.layouts) do
    table.sort(layout.items, function(a, b) return a.zIndex < b.zIndex end)
  end
  return data
end

local function loadImage(path)
  local bytes = readFile(path)
  if not bytes then
    return nil
  end
  -- Mipmaps keep large exports from aliasing when scaled well below full size.
  local loaded, image = pcall(function()
    return love.graphics.newImage(love.filesystem.newFileData(bytes, path), { mipmaps = true })
  end)
  return loaded and image or nil
end

-- LÖVE can't read SVG, so an .svg asset uses the PNG rasterized beside it
-- (see README). The composition itself keeps pointing at the SVG.
local function loadAssets(assets, folder)
  for _, asset in ipairs(assets or {}) do
    local path = folder .. "/" .. asset.path:gsub("%.[sS][vV][gG]$", ".png")
    images[asset.id] = loadImage(path)
    if not images[asset.id] then
      print(("Asset %s: no usable image at %s, drawing a placeholder"):format(asset.id, path))
    end
  end
end

-- Covers what the exporter emits (#rrggbb, rgba(r, g, b, a)) plus the obvious
-- hand-written variants. Returns nil for anything else, which draws no background.
local function parseColor(css)
  local r, g, b, a = css:match("^#(%x%x)(%x%x)(%x%x)(%x?%x?)$")
  if r then
    local alpha = a == "" and 255 or tonumber(a, 16)
    return { tonumber(r, 16) / 255, tonumber(g, 16) / 255, tonumber(b, 16) / 255, alpha / 255 }
  end

  r, g, b, a = css:match("^rgba?%(%s*([%d.]+)%s*,%s*([%d.]+)%s*,%s*([%d.]+)%s*,?%s*([%d.]*)%s*%)$")
  if r then
    return { r / 255, g / 255, b / 255, tonumber(a) or 1 }
  end
  return nil
end

-- The largest minWidth not exceeding width. Layouts are sorted ascending, and
-- the validated base layout (minWidth 0) guarantees a match.
local function selectLayout(layouts, width)
  local selected = layouts[1]
  for _, layout in ipairs(layouts) do
    if layout.minWidth <= width then
      selected = layout
    end
  end
  return selected
end

local function drawPlaceholder(item, width, height)
  love.graphics.setColor(PLACEHOLDER_FILL)
  love.graphics.rectangle("fill", 0, 0, width, height)
  love.graphics.setColor(PLACEHOLDER_LINE)
  love.graphics.rectangle("line", 0, 0, width, height)
  love.graphics.setColor(PLACEHOLDER_TEXT)
  local textY = (height - love.graphics.getFont():getHeight()) / 2
  love.graphics.printf(item.name or item.id or "", 0, textY, width, "center")
end

local function drawItem(item, left, top, scale)
  local width, height = item.width * scale, item.height * scale

  love.graphics.push()
  -- x/y is where the item's own top-left corner lands after rotating around
  -- its center, so turning about that corner gives the same placement.
  -- (React needs a correction here only because CSS pivots on the box center.)
  love.graphics.translate(left + item.x * scale, top + item.y * scale)
  love.graphics.rotate(math.rad(item.rotation or 0))

  local image = images[item.assetId]
  if image then
    love.graphics.setColor(1, 1, 1)
    love.graphics.draw(image, 0, 0, 0, width / image:getWidth(), height / image:getHeight())
  else
    drawPlaceholder(item, width, height)
  end

  love.graphics.pop()
end

function love.load(args)
  love.graphics.setBackgroundColor(WINDOW_COLOR)

  local path = args[1] or (love.filesystem.getSource() .. "/" .. DEFAULT_COMPOSITION)
  composition = loadComposition(path)
  loadAssets(composition.assets, path:match("^(.*)[/\\]") or ".")

  if type(composition.name) == "string" then
    love.window.setTitle(composition.name)
  end
end

-- Everything derives from the current window size, so resizing needs no handler.
function love.draw()
  local windowWidth, windowHeight = love.graphics.getDimensions()
  local layout = selectLayout(composition.layouts, windowWidth)

  -- Selection uses the space available, never the fitted size: that depends on
  -- which layout is selected, so measuring it would be circular.
  local scale = math.min(windowWidth / layout.width, windowHeight / layout.height)
  local width, height = layout.width * scale, layout.height * scale
  local left, top = (windowWidth - width) / 2, (windowHeight - height) / 2

  local background = layout.backgroundColor and parseColor(layout.backgroundColor)
  if background then
    love.graphics.setColor(background)
    love.graphics.rectangle("fill", left, top, width, height)
  end

  if layout.clipsContent ~= false then
    love.graphics.setScissor(left, top, width, height)
  end
  for _, item in ipairs(layout.items) do
    drawItem(item, left, top, scale)
  end
  love.graphics.setScissor()
end
