using System;
using System.Collections.Generic;
using System.Text;
using System.Net;
using System.IO;
using System.Globalization;
using System.Security.Cryptography.X509Certificates;
using System.Diagnostics;

namespace ConsoleHttpGet {
    public static class StreamHelper {
        public static void Copy(Stream source, Stream target, int blockSize) {
            int read;
            byte[] buffer = new byte[blockSize];
            while ((read = source.Read(buffer, 0, blockSize)) > 0) {
                target.Write(buffer, 0, read);
            }
        }
        public static void BlockCopy(this Stream source, Stream target, int blockSize = 65536) {
            Copy(source, target, blockSize);
        }
    }

    class Program {
        
        static string configFileName = "ConfigGET.xml";

        static void Main(string[] args) {
            if (args.Length > 0)
                configFileName = args[0];

            ConfigGET config = ConfigGET.getConfigGET(configFileName);

            logFileName = ConfigGET.OUT_DIR + "ConsoleGET_" + DateTime.Now.ToString("yyyy-MM-dd_HH-mm-ss") + ".log";
            printLine("GETing: ");
            printLine(config.StringURL + Environment.NewLine);
            doGETs(config);
            Console.Out.WriteLine("\n Press enter to exit.");
            Console.In.Read();
        }

        private static void doGETs(ConfigGET config) {
            int countGET = 0;
            while (countGET < config.GetTimes) {
                printLine(DateTime.Now.ToString());
                Stopwatch stopWatch = new Stopwatch();
                countGET++;
                try {
                    string fileName = ConfigGET.OUT_DIR + config.OutputFileNamePrefix + "_"+ DateTime.Now.ToString("yyyy-MM-dd_HH-mm-ss") + "." + config.OutputFileExt;
                    /*using (var wc = new System.Net.WebClient()) {
                        
                        wc.DownloadFile(config.StringURL, fileName);
                    }*/
                    HttpWebRequest GETRequest = (HttpWebRequest)WebRequest.Create(config.StringURL);
                    //For HTTPS two way cert, must be imported to "Trusted Root Certificate Authorities", Location: IE > Tools > Internet Options > Content > Certificates
                    GETRequest.ClientCertificates.Add(new X509Certificate(config.SslCertFileName, config.getCertPassword())); // ours/CACI
                    //End HTTPS
                    GETRequest.Method = "GET";
                    GETRequest.KeepAlive = false;
                    GETRequest.Timeout = config.ClientTimeout;

                    stopWatch.Start();

                    HttpWebResponse GETResponse = (HttpWebResponse)GETRequest.GetResponse();
                    StreamReader reader = new StreamReader(GETResponse.GetResponseStream(), Encoding.UTF8);
                    string daLocation = GETResponse.GetResponseHeader("Location");
                    HttpStatusCode daStatusCode = GETResponse.StatusCode;
                    
                    printLine("StatusCode: " + daStatusCode);

                    if (daStatusCode == HttpStatusCode.Accepted ||
                        daStatusCode == HttpStatusCode.Created ||
                        daStatusCode == HttpStatusCode.OK) {
                            using (Stream stream = GETResponse.GetResponseStream())
                            using (FileStream fs = new FileStream(fileName, FileMode.Create, FileAccess.Write, FileShare.None)) {
                                stream.BlockCopy(fs);
                            }                            
                            //File.Write(fileName, POSTResponse.GetResponseStream().ReadByte
                            //File.AppendAllText(fileName, reader.ReadToEnd());
                            GETResponse.Close();
                            System.Threading.Thread.Sleep(1000);
                    }
                } catch (WebException we) {
                    String errMsg = we.Message;
                    if (we.Response != null)
                        errMsg += "; " + new StreamReader(we.Response.GetResponseStream(), Encoding.UTF8).ReadToEnd().ToString();
                    printLine(errMsg);
                }
                stopWatch.Stop();
                TimeSpan ts = stopWatch.Elapsed;
                string elapsedTime = String.Format("{0:00}:{1:00}:{2:00}.{3:00}",
                                                        ts.Hours, ts.Minutes, ts.Seconds,
                                                        ts.Milliseconds / 10);
                printLine("Elapsed Time: " + elapsedTime);
                printLine("GET Count: " + countGET + Environment.NewLine);
            }
        }

        static string logFileName = "ConsolePOST.log";

        private static void printLine(String msg) {
            System.Diagnostics.Debug.WriteLine(msg);
            Console.WriteLine(msg);
            File.AppendAllText(logFileName, msg + Environment.NewLine);
        }
    }
}
