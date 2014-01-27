using System;
using System.Collections.Generic;
using System.Text;
using System.IO;

namespace ConsoleHttpGet {
    class ConfigGET {

        public string OutputFileName { get; set; }

        internal static ConfigGET getConfigGET() {
            var config = new ConfigGET();
            //check for config file, load if exsists, 
            //if not load defaults

            config.GetTimes = 50;
            config.OutputFileExt = "xml";
            DirectoryInfo di = Directory.CreateDirectory("console_GET");
            config.OutputFileName = @"console_GET/ConsoleHttpGet";

            //config.StringURL = "http://localhost:3001/ecrud/v1/core/fs/52811d03c26e69442065750e";
            //config.StringURL = "http://localhost:3001/ecrud/v1/core/fs/52e6c73af3cedd800b000001";
            //config.StringURL = "http://das.dynalias.org:8080/ecrud/v1/core/electronicCaseFiles/transform";
            //for HTTPS
            //config.StringURL = "https://silvervler.va.gov/ecrud/v1/fs";
            config.StringURL = "https://goldvler.va.gov/ecrud/v1/core/fs/52e6b970478e28f86300025e?moroni=true"; //30 MB generated xml file
            //config.StringURL = "https://goldvler.va.gov/ecrud/v1/core/fs/52af137459fde27176000053?moroni=true"; //jpg
            //config.StringURL = "https://goldvler.va.gov/ecrud/v1/core/fs/52af137559fde27176000056?moroni=true"; //whole document jpg
            //config.StringURL = "https://goldvler.va.gov/ecrud/v1/core/electronicCaseFiles?limit=500";
            
            config.PathToKey = @"E:\VA\2waySSL\clientcert.pkcs12";
            config.KeyPassword = "keypass";

            config.ClientTimeout = 600000; //10 Min

            //save config to file
            return config;
        }

        public string StringURL { get; set; }

        public int GetTimes { get; set; }

        public string PathToKey { get; set; }

        public string KeyPassword { get; set; }

        public int ClientTimeout { get; set; }

        internal string getOutputFileName() {
            return Path.GetFileName(this.OutputFileName);
        }

        public string OutputFileExt { get; set; }
    }
}
