  -- Keys are user:troupe keys
  local key = KEYS[1]

  local key_type = redis.call("TYPE", key)["ok"]

  if key_type == "set" then
    return redis.call("SMEMBERS", key)
  elseif key_type == "none" then
    return {}
  else
    return redis.call("ZRANGE", key, 0, -1);
  end

  return {}
