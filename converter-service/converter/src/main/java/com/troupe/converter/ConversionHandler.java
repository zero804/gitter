package com.troupe.converter;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.Map;

import javax.annotation.Resource;

import org.apache.camel.Body;
import org.apache.camel.Exchange;
import org.apache.camel.Handler;
import org.apache.camel.Header;
import org.apache.camel.OutHeaders;
import org.springframework.stereotype.Component;

@Component("conversionHandler")
public class ConversionHandler {

	@Resource
	ConversionService conversionService;

	@Handler
	public byte[] convert(@Body InputStream in, @Header(Exchange.CONTENT_TYPE) String mimeType,
			Exchange exchange) {
		ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
		conversionService.convert(in, mimeType, outputStream );
		
		exchange.getIn().setHeader(Exchange.CONTENT_TYPE, "application/pdf");
		return outputStream.toByteArray();
	}
}
