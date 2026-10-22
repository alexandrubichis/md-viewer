#!/bin/sh
# Builds dist/mdview_<version>_all.deb. Needs only dpkg-deb.
set -eu
cd "$(dirname "$0")"

APP_ID=io.github.alexandrubichis.MdView
VERSION=$(sed -n 's/^VERSION = "\(.*\)"$/\1/p' mdview.py)
ROOT=build/mdview_${VERSION}_all

rm -rf build
mkdir -p "$ROOT/DEBIAN" "$ROOT/usr/bin" "$ROOT/usr/share/mdview" \
    "$ROOT/usr/share/applications" "$ROOT/usr/share/metainfo" \
    "$ROOT/usr/share/icons/hicolor/scalable/apps" "$ROOT/usr/share/doc/mdview"

cp mdview.py "$ROOT/usr/share/mdview/"
cp -r assets "$ROOT/usr/share/mdview/"
cp data/$APP_ID.desktop "$ROOT/usr/share/applications/"
cp data/$APP_ID.metainfo.xml "$ROOT/usr/share/metainfo/"
cp data/icons/hicolor/scalable/apps/$APP_ID.svg "$ROOT/usr/share/icons/hicolor/scalable/apps/"
cp packaging/copyright "$ROOT/usr/share/doc/mdview/"
cp CHANGELOG.md "$ROOT/usr/share/doc/mdview/"

cat > "$ROOT/usr/bin/mdview" <<'EOF'
#!/bin/sh
exec /usr/bin/python3 /usr/share/mdview/mdview.py "$@"
EOF

find "$ROOT" -type d -exec chmod 755 {} +
find "$ROOT" -type f -exec chmod 644 {} +
chmod 755 "$ROOT/usr/bin/mdview" "$ROOT/usr/share/mdview/mdview.py"

SIZE=$(du -sk --exclude=DEBIAN "$ROOT" | cut -f1)
sed -e "s/@VERSION@/$VERSION/" -e "s/@SIZE@/$SIZE/" packaging/control > "$ROOT/DEBIAN/control"

mkdir -p dist
dpkg-deb --root-owner-group --build "$ROOT" dist/
