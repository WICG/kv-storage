local: spec.bs
	bikeshed spec spec.bs spec.html

remote: spec.bs
	curl --fail https://api.csswg.org/bikeshed/ -f -F file=@spec.bs > spec.html

ci: spec.bs
	curl --fail https://api.csswg.org/bikeshed/ -f -F file=@spec.bs -F output=err
	mkdir out
	curl --fail https://api.csswg.org/bikeshed/ -f -F file=@spec.bs > out/index.html
