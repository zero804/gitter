for i in `find . -name *.js`; do echo $i; ~/code/opensource/nodefy/bin/nodefy $i > $i.new; mv $i.new $i; done
