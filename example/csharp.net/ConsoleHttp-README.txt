README.txt for ConsoleHttpPost.exe and ConsoleHttpGet.exe

1) Get the ConsoleHttpTools-Release-XxX.7z file
	GitHub: https://github.com/department-of-veterans-affairs/vlerdas-ecrud/tree/master/example/csharp.net
	Or email or shared drive, etc...
2) Extract 7z zip
3) Optionally download example files from GitHub
	https://github.com/department-of-veterans-affairs/vlerdas-ecrud/blob/master/example/samplesForTransform.7z
4) Open command propmt, navigate to extracted files location

Command line usage:

> ConsoleHttpPost
	That basic command will look in the current directory for a configuration file named "ConfigPOST.xml"

> ConsoleHttpPost {path to config file name}
Example:
> ConsoleHttpPost config/ConfigPOST-Silver-20Kjpg.xml
	Will load the specified file and do a POST based on the properties set in the config file passed.
	Log files and generated files will be saved in the "./console_POST" directory

ConsoleHttpGet application looks for a configuration file named "ConfigGET.xml" and outputs to "./console_GET", 
	following the same pattern as POST
	
See the included ConfigGET.xml and ConfigPOST.xml, both have comments for each of the properties that can be configured.
Also see the included directory named "Config" for many different configuration files.
By using many configuration files you can setup POST and GET on the various servers with different URLs, simply,
	with a single command line for each.