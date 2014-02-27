  -- Keys are user:troupe keys
  local key_count = #KEYS
  local expire_seconds = ARGV[1]

  local result = {}

  for k, v in pairs(KEYS) do
    local r = redis.call("SETNX", v, 1)

    if r == 1 then
      redis.call("EXPIRE", v, expire_seconds)
    end

    table.insert(result, r)
  end

  return result