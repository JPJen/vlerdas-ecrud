using System;
using System.Collections.Generic;
using System.Text;
using System.IO;
using System.Xml.Serialization;

namespace ConsoleHttpGet {
    public class ConfigGET {

        public string OutputFileNamePrefix { get; set; }
        public string OutputFileExt { get; set; }

        public const string OUT_DIR = "console_GET/";

        internal static ConfigGET getConfigGET(string configFileName) {
            ConfigGET config = null;
            DirectoryInfo di = Directory.CreateDirectory(OUT_DIR);

            XmlSerializer x = new XmlSerializer(typeof(ConfigGET));
            if (File.Exists(configFileName)) {
                FileStream fs = new FileStream(configFileName, FileMode.Open);
                config = (ConfigGET)x.Deserialize(fs);
            } else {
                config = new ConfigGET();
                config.GetTimes = 1;
                config.OutputFileExt = "pdf";
                config.OutputFileNamePrefix = @"CnP-EXAM";

                config.StringURL = "http://localhost:3001/ecrud/v1/core/fs/52811d03c26e69442065750e";
                //config.StringURL = "http://localhost:3001/ecrud/v1/core/fs/52e6c73af3cedd800b000001";
                //config.StringURL = "http://das.dynalias.org:8080/ecrud/v1/core/electronicCaseFiles/transform";
                //for HTTPS
                //config.StringURL = "https://silvervler.va.gov/ecrud/v1/fs";
                //config.StringURL = "https://goldvler.va.gov/ecrud/v1/core/fs/52e6b970478e28f86300025e?moroni=true"; //30 MB generated xml file
                //config.StringURL = "https://goldvler.va.gov/ecrud/v1/core/fs.files?query={%22length%22:{%22$gt%22:100000000}}&$sort={%22$natural%22:-1}";

                //config.StringURL = "https://goldvler.va.gov/ecrud/v1/core/fs/52af137459fde27176000053?moroni=true"; //jpg
                //config.StringURL = "https://goldvler.va.gov/ecrud/v1/core/fs/52af137559fde27176000056?moroni=true"; //whole document jpg
                //config.StringURL = "https://goldvler.va.gov/ecrud/v1/core/electronicCaseFiles?limit=500";

                config.SslCertFileName = @"E:\VA\2waySSL\clientcert.pkcs12";
                config.SslCertPasswordFileName = @"E:\VA\2waySSL\clientcert.pkcs12-password.txt";

                config.ClientTimeout = 600000; //10 Min

                StreamWriter writer = new StreamWriter(configFileName);
                x.Serialize(writer, config);
                writer.Close();
            }
            //save config to file
            return config;
        }

        public string getCertPassword() {
            return File.ReadAllText(SslCertPasswordFileName);
        }

        public string StringURL { get; set; }

        public int GetTimes { get; set; }

        public string SslCertFileName { get; set; }

        public string SslCertPasswordFileName { get; set; }

        public int ClientTimeout { get; set; }

    }
}
