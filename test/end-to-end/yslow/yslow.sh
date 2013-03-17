export ROOT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../../.." && pwd )"

mkdir -p $ROOT_DIR/output/yslow
phantomjs $ROOT_DIR/test/end-to-end/yslow/yslow.js -i grade -threshold "B" -f junit $1 > $ROOT_DIR/output/yslow/yslow.xml