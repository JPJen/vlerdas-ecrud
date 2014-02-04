using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace ConsoleHttpPost {
    class NiemXML {

        public string getBeforeBase64(string docTitle) {
            String xml = @"<case:ElectronicCaseFile xmlns:vler=""http://va.gov/vler/schemas/vlerSupersetSchema/0.7/vler"" 
                                    xmlns:nc=""http://niem.gov/niem/niem-core/2.0"" 
                                    xmlns:case=""http://vler.va.gov/vler/schemas/health/clinicalDocuments/electronicCaseFiles/1.3"" 
                                    xmlns:xsi=""http://www.w3.org/2001/XMLSchema-instance"" xmlns:s=""http://niem.gov/niem/structures/2.0"">
	                        <case:CommonData>
		                        <nc:Document>
			                        <nc:DocumentTitleText>" + docTitle + @"</nc:DocumentTitleText>
			                        <nc:DocumentVersion>1</nc:DocumentVersion>
		                        </nc:Document>
	                        </case:CommonData>
	                        <case:Attachments>
		                        <nc:Attachment>
			                        <nc:BinaryBase64Object>";
            return xml;
        }

        public string getAfterBase64(int byteCount, string descText, string formatName, string fileName) {
            String xml = @"</nc:BinaryBase64Object>
			                    <nc:BinaryDescriptionText>" + descText + @"</nc:BinaryDescriptionText>
			                    <nc:BinaryFormatStandardName>" + formatName + @"</nc:BinaryFormatStandardName>
			                    <nc:BinaryLocationURI>" + fileName + @"</nc:BinaryLocationURI>
			                    <nc:BinarySizeValue>" + byteCount + @"</nc:BinarySizeValue>
			                    <nc:BinaryCategoryText>" + descText + @"</nc:BinaryCategoryText>
		                    </nc:Attachment>
	                    </case:Attachments>
                    </case:ElectronicCaseFile>";
            return xml;
        }
    }
}
