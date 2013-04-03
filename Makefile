
all:
	true

deploy:
	git subtree push --prefix dist origin gh-pages
