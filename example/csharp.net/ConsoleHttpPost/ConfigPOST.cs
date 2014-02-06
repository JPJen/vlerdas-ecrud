using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.IO;
using System.Xml.Serialization;

namespace ConsoleHttpPost {
    public class ConfigPOST {

        public const string OUT_DIR = "console_POST/";

        public string Base64FileName { get; set; }

        internal static ConfigPOST getConfigPOST(string configFileName) {
            ConfigPOST config = null;
            DirectoryInfo di = Directory.CreateDirectory(OUT_DIR);
            //DirectoryInfo di = Directory.CreateDirectory("console_POST");
            //config.OutputFileName = @"console_GET/ConsoleHttpGet";
            //check for config file, load if exsists, 
            XmlSerializer x = new XmlSerializer(typeof(ConfigPOST));
            if (File.Exists(configFileName)) {
                FileStream fs = new FileStream(configFileName, FileMode.Open);
                // Call the Deserialize method and cast to the object type.
                config = (ConfigPOST)x.Deserialize(fs);
            } else {
                config = new ConfigPOST();
                //if not load defaults

                config.PostTimes = 1;
                config.CompleteDocFileName = "../../samplesForTransform/dental-xray.jpg.txt(whole).xml";
                //string loadFileName = @"E:\VA\VLERDoc.xml";
                //config.CompleteDocFileName = @"E:\Code\GitHub\vlerdas-ecrud\test\attachments\eCFT1MBAttachEmbeded.xml";
                //config.CompleteDocFileName = @"C:\vler-proto-out\generated_out\xmlWithEmbeddedB64_5MB_a.xml"; //6.8 MB
                //config.CompleteDocFileName = @"C:\vler-proto-out\generated_out\xmlWithEmbeddedB64_14MB_a.xml"; //19.1 MB
                //string loadFileName = @"C:\vler-proto-out\generated_out\xmlWithEmbeddedB64_17MB_a.xml"; //23.2 MB
                //config.CompleteDocFileName = @"C:\vler-proto-out\generated_out\xmlWithEmbeddedB64_21MB_a.xml"; //28.7 MB
                //config.CompleteDocFileName = @"C:\vler-proto-out\generated_out\xmlWithEmbeddedB64_25MB_a.xml"; //34.2 MB
                //config.Base64FileName = @"F:\Dev Tools\mongodbWin32_64.zip.b64.txt"; //138 MB
                //config.Base64FileName = @"F:\Dev Tools\SnippetManager.b64.txt"; //zip file 507 KB
                //config.Base64FileName = @"F:\Dev Tools\dental-xray.jpg.txt"; //13.7 KB
                //config.Base64FileName = @"F:\Dev Tools\snake-river4.pdf.txt"; //32.1.7 KB
                //config.Base64FileName = @"C:\vler-proto-out\generated_out\xmlAttachment-Over1MB.xml.b64"; //1.33 MB

                //config.CompleteDocFileName = @"mongodbWin32_64.zip.b64.txt(whole).xml"; //138 MB

                config.StringURL = "http://localhost:3001/ecrud/v1/core/electronicCaseFiles/transform";
                //config.StringURL = "http://das.dynalias.org:8080/ecrud/v1/core/electronicCaseFiles/transform";
                //for HTTPS
                //config.StringURL = "https://silvervler.va.gov/ecrud/v1/core/electronicCaseFiles/transform?batchComplete=true&moroni=true";
                //config.StringURL = "https://silvervler.va.gov/ecrud/v1/core/moroni/transform?batchComplete=true&moroni=true";
                //config.StringURL = "https://goldvler.va.gov/ecrud/v1/core/moroni/transform?batchComplete=true&moroni=true";

                //config.DocTitle = "LargeAttachmentTitle-MoroniApp";
                config.DocTitle = getANameFromTheFile(config);
                //config.AttachmentDescription = "Mongodb zip file";
                //config.AttachmentFormatName = "application/zip";

                //config.AttachmentDescription = "Snake River PDF";
                config.AttachmentDescription = getANameFromTheFile(config);
                config.AttachmentFormatName = guessAttachmentFormat(getANameFromTheFile(config));

                config.SslCertFileName = @"E:\VA\2waySSL\clientcert.pkcs12";
                config.SslCertPasswordFileName = @"E:\VA\2waySSL\clientcert.pkcs12-password.txt";
                //POSTRequest.ClientCertificates.Add(new X509Certificate(@"F:\Downloads\ides-cftdeom.asmr.com.cer", "test123"));
                //POSTRequest.ClientCertificates.Add(new X509Certificate(@"E:\VA\DoDCerts\dodRootCA2.cer"));
                //POSTRequest.ClientCertificates.Add(new X509Certificate(@"E:\VA\DoDCerts\DODJITCCA-27.crt"));
                //POSTRequest.ClientCertificates.Add(new X509Certificate(@"E:\VA\DoDCerts\ides-cftdemo.asmr.com.crt"));

                config.ClientTimeout = (int)(600000 * 1.5); //15 Min

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

        static string guessAttachmentFormat(string fileName) {
            if (fileName.ToLower().Contains("jpg") || fileName.ToLower().Contains("jpeg"))
                return "image/jpg";
            else if (fileName.ToLower().Contains("pdf"))
                return "application/pdf";
            else if (fileName.ToLower().Contains("xml"))
                return "application/xml";
            return "";
        }

        public string DocTitle { get; set; }

        public string AttachmentDescription { get; set; }

        public string AttachmentFormatName { get; set; }

        public string StringURL { get; set; }

        public int PostTimes { get; set; }

        public string SslCertFileName { get; set; }

        public string SslCertPasswordFileName { get; set; }

        public int ClientTimeout { get; set; }

        internal string getAttachmentFileName() {
            ConfigPOST config = this;
            return getANameFromTheFile(config);
        }

        private static string getANameFromTheFile(ConfigPOST config) {
            return config.Base64FileName != null ? Path.GetFileName(config.Base64FileName) : Path.GetFileName(config.CompleteDocFileName);
        }

        public string CompleteDocFileName { get; set; }
    }
}
