function love.conf(t)
  t.identity = "paster-lua"
  t.version = "11.5"
  t.window.title = "Paster"
  t.window.width = 1280
  t.window.height = 800
  t.window.minwidth = 200
  t.window.minheight = 200
  t.window.resizable = true
  -- Keeps love.graphics sizes in logical units, so breakpoints compare against
  -- the same kind of pixel as CSS px on a high-density display.
  t.window.highdpi = true
end
