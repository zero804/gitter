ack log! -l |xargs sed -i .backup -Ee "s#log!(.*)'#utils/log'#"
